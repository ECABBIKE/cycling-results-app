import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import Papa from 'papaparse';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { type, seriesId, className } = req.query;

    if (!type || typeof type !== 'string') {
      return res.status(400).json({ error: 'type parameter is required' });
    }

    if (type === 'newsletter') {
      // Exportera e-postlista för nyhetsbrev
      const riders = await prisma.rider.findMany({
        where: {
          email: {
            not: null
          },
          mergedIntoId: null
        },
        select: {
          firstName: true,
          lastName: true,
          email: true,
          club: true,
          phone: true
        },
        orderBy: [
          { lastName: 'asc' },
          { firstName: 'asc' }
        ]
      });

      const csv = Papa.unparse(riders);
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=newsletter-lista.csv');
      return res.status(200).send(csv);
    }

    if (type === 'standings') {
      // Exportera serietabell
      if (!seriesId || typeof seriesId !== 'string') {
        return res.status(400).json({ error: 'seriesId is required for standings export' });
      }

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
        },
        orderBy: [
          { className: 'asc' },
          { points: 'desc' }
        ]
      });

      // Aggregera poäng
      const standingsMap = new Map<string, any>();

      for (const result of results) {
        const key = `${result.riderId}-${result.className}`;
        
        if (!standingsMap.has(key)) {
          standingsMap.set(key, {
            firstName: result.rider.firstName,
            lastName: result.rider.lastName,
            club: result.rider.club,
            className: result.className,
            totalPoints: 0,
            eventCount: 0
          });
        }

        const standing = standingsMap.get(key);
        standing.totalPoints += result.points;
        standing.eventCount += 1;
      }

      const standings = Array.from(standingsMap.values())
        .sort((a, b) => {
          if (a.className !== b.className) {
            return a.className.localeCompare(b.className);
          }
          if (b.totalPoints !== a.totalPoints) {
            return b.totalPoints - a.totalPoints;
          }
          return b.eventCount - a.eventCount;
        });

      const csv = Papa.unparse(standings);
      
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename=serietabell.csv');
      return res.status(200).send('\ufeff' + csv); // UTF-8 BOM för Excel
    }

    if (type === 'riders') {
      // Exportera alla deltagare
      const riders = await prisma.rider.findMany({
        where: {
          mergedIntoId: null
        },
        include: {
          results: {
            select: {
              id: true
            }
          }
        },
        orderBy: [
          { lastName: 'asc' },
          { firstName: 'asc' }
        ]
      });

      const data = riders.map(r => ({
        firstName: r.firstName,
        lastName: r.lastName,
        club: r.club,
        uciId: r.uciId,
        email: r.email,
        phone: r.phone,
        resultCount: r.results.length
      }));

      const csv = Papa.unparse(data);
      
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename=deltagare.csv');
      return res.status(200).send('\ufeff' + csv);
    }

    return res.status(400).json({ error: 'Invalid export type' });

  } catch (error) {
    console.error('Error exporting data:', error);
    return res.status(500).json({ error: 'Failed to export data' });
  }
}
