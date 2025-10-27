import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { findDuplicates, groupDuplicates } from '@/lib/matching';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const { threshold } = req.query;
      const similarityThreshold = threshold ? parseFloat(threshold as string) : 0.75;

      const riders = await prisma.rider.findMany({
        where: {
          mergedIntoId: null
        }
      });

      const matches = findDuplicates(riders, similarityThreshold);
      const groups = groupDuplicates(matches);

      // Hämta full data för varje grupp
      const enrichedGroups = await Promise.all(
        groups.map(async (group) => {
          const ridersData = await prisma.rider.findMany({
            where: {
              id: { in: group }
            },
            include: {
              results: {
                select: {
                  id: true
                }
              }
            }
          });

          // Hitta bästa matchning för denna grupp
          const groupMatches = matches.filter(m => 
            group.includes(m.rider1Id) && group.includes(m.rider2Id)
          );

          const maxSimilarity = Math.max(...groupMatches.map(m => m.similarity));
          const reasons = [...new Set(groupMatches.flatMap(m => m.reasons))];

          return {
            riders: ridersData.map(r => ({
              ...r,
              resultCount: r.results.length
            })),
            similarity: maxSimilarity,
            reasons
          };
        })
      );

      return res.status(200).json(enrichedGroups);
    } catch (error) {
      console.error('Error finding duplicates:', error);
      return res.status(500).json({ error: 'Failed to find duplicates' });
    }
  }

  if (req.method === 'POST') {
    try {
      const { keepId, mergeIds } = req.body;

      if (!keepId || !mergeIds || !Array.isArray(mergeIds) || mergeIds.length === 0) {
        return res.status(400).json({ error: 'keepId and mergeIds array are required' });
      }

      // Uppdatera alla resultat att peka på den behållna ridern
      await prisma.result.updateMany({
        where: {
          riderId: { in: mergeIds }
        },
        data: {
          riderId: keepId
        }
      });

      // Markera mergade riders
      await prisma.rider.updateMany({
        where: {
          id: { in: mergeIds }
        },
        data: {
          mergedIntoId: keepId
        }
      });

      // Hämta den behållna ridern med uppdaterad data
      const keeper = await prisma.rider.findUnique({
        where: { id: keepId },
        include: {
          results: true
        }
      });

      return res.status(200).json(keeper);
    } catch (error) {
      console.error('Error merging riders:', error);
      return res.status(500).json({ error: 'Failed to merge riders' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
