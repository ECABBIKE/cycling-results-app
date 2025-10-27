import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const { seriesId, className } = req.query;

      if (!seriesId || typeof seriesId !== 'string') {
        return res.status(400).json({ error: 'seriesId is required' });
      }

      // Hämta serie
      const series = await prisma.series.findUnique({
        where: { id: seriesId },
        include: {
          events: {
            select: {
              id: true,
              name: true,
              date: true
            }
          }
        }
      });

      if (!series) {
        return res.status(404).json({ error: 'Series not found' });
      }

      // Hämta alla resultat för serien
      const results = await prisma.result.findMany({
        where: {
          event: {
            seriesId
          },
          invalid: false,
          ...(className && typeof className === 'string' ? { className } : {})
        },
        include: {
          rider: true,
          event: true
        }
      });

      // Aggregera poäng per rider och klass
      const standingsMap = new Map<string, any>();

      for (const result of results) {
        const key = `${result.riderId}-${result.className}`;
        
        if (!standingsMap.has(key)) {
          standingsMap.set(key, {
            rider: result.rider,
            className: result.className,
            totalPoints: 0,
            events: [],
            eventCount: 0
          });
        }

        const standing = standingsMap.get(key);
        standing.totalPoints += result.points;
        standing.eventCount += 1;
        standing.events.push({
          eventName: result.event.name,
          eventDate: result.event.date,
          position: result.position,
          points: result.points
        });
      }

      // Konvertera till array och sortera
      const standings = Array.from(standingsMap.values())
        .sort((a, b) => {
          // Sortera efter totala poäng
          if (b.totalPoints !== a.totalPoints) {
            return b.totalPoints - a.totalPoints;
          }
          // Vid lika poäng, sortera efter antal event
          return b.eventCount - a.eventCount;
        });

      // Lägg till placering
      let currentRank = 1;
      standings.forEach((standing, index) => {
        if (index > 0 && standings[index - 1].totalPoints === standing.totalPoints) {
          standing.rank = standings[index - 1].rank;
        } else {
          standing.rank = currentRank;
        }
        currentRank++;
      });

      // Beräkna team standings om teamBased
      let teamStandings = null;
      if (series.teamBased) {
        const teamMap = new Map<string, any>();

        for (const result of results) {
          if (!result.rider.club) continue;

          const key = `${result.rider.club}-${result.className}`;
          
          if (!teamMap.has(key)) {
            teamMap.set(key, {
              teamName: result.rider.club,
              className: result.className,
              totalPoints: 0,
              riders: new Set<string>()
            });
          }

          const team = teamMap.get(key);
          team.totalPoints += result.points;
          team.riders.add(result.riderId);
        }

        teamStandings = Array.from(teamMap.values())
          .map(t => ({
            ...t,
            riderCount: t.riders.size,
            riders: undefined
          }))
          .sort((a, b) => b.totalPoints - a.totalPoints);

        // Lägg till placering
        currentRank = 1;
        teamStandings.forEach((standing, index) => {
          if (index > 0 && teamStandings[index - 1].totalPoints === standing.totalPoints) {
            standing.rank = teamStandings[index - 1].rank;
          } else {
            standing.rank = currentRank;
          }
          currentRank++;
        });
      }

      return res.status(200).json({
        series,
        standings,
        teamStandings
      });

    } catch (error) {
      console.error('Error fetching standings:', error);
      return res.status(500).json({ error: 'Failed to fetch standings' });
    }
  }

  if (req.method === 'POST') {
    // Beräkna om standings för en serie
    try {
      const { seriesId } = req.body;

      if (!seriesId) {
        return res.status(400).json({ error: 'seriesId is required' });
      }

      // Ta bort gamla standings
      await prisma.standing.deleteMany({
        where: { seriesId }
      });

      await prisma.teamStanding.deleteMany({
        where: { seriesId }
      });

      // Hämta serie
      const series = await prisma.series.findUnique({
        where: { id: seriesId }
      });

      if (!series) {
        return res.status(404).json({ error: 'Series not found' });
      }

      // Hämta alla giltiga resultat
      const results = await prisma.result.findMany({
        where: {
          event: {
            seriesId
          },
          invalid: false
        },
        include: {
          rider: true
        }
      });

      // Aggregera individuella standings
      const standingsMap = new Map<string, any>();

      for (const result of results) {
        const key = `${seriesId}-${result.riderId}-${result.className}`;
        
        if (!standingsMap.has(key)) {
          standingsMap.set(key, {
            seriesId,
            riderId: result.riderId,
            className: result.className,
            totalPoints: 0,
            eventCount: 0
          });
        }

        const standing = standingsMap.get(key);
        standing.totalPoints += result.points;
        standing.eventCount += 1;
      }

      // Spara standings
      for (const standing of standingsMap.values()) {
        await prisma.standing.create({
          data: standing
        });
      }

      // Aggregera team standings om teamBased
      if (series.teamBased) {
        const teamMap = new Map<string, any>();

        for (const result of results) {
          if (!result.rider.club) continue;

          const key = `${seriesId}-${result.rider.club}-${result.className}`;
          
          if (!teamMap.has(key)) {
            teamMap.set(key, {
              seriesId,
              teamName: result.rider.club,
              className: result.className,
              totalPoints: 0,
              riders: new Set<string>()
            });
          }

          const team = teamMap.get(key);
          team.totalPoints += result.points;
          team.riders.add(result.riderId);
        }

        // Spara team standings
        for (const team of teamMap.values()) {
          await prisma.teamStanding.create({
            data: {
              seriesId: team.seriesId,
              teamName: team.teamName,
              className: team.className,
              totalPoints: team.totalPoints,
              riderCount: team.riders.size
            }
          });
        }
      }

      return res.status(200).json({ success: true, message: 'Standings recalculated' });

    } catch (error) {
      console.error('Error recalculating standings:', error);
      return res.status(500).json({ error: 'Failed to recalculate standings' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
