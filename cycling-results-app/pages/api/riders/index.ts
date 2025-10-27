import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { findDuplicates, groupDuplicates } from '@/lib/matching';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const riders = await prisma.rider.findMany({
        where: {
          mergedIntoId: null // Visa bara aktiva riders, inte mergade
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

      const ridersWithCount = riders.map(r => ({
        ...r,
        resultCount: r.results.length,
        results: undefined
      }));

      return res.status(200).json(ridersWithCount);
    } catch (error) {
      console.error('Error fetching riders:', error);
      return res.status(500).json({ error: 'Failed to fetch riders' });
    }
  }

  if (req.method === 'POST') {
    try {
      const { firstName, lastName, club, uciId, email, phone } = req.body;

      if (!firstName || !lastName) {
        return res.status(400).json({ error: 'firstName and lastName are required' });
      }

      const rider = await prisma.rider.create({
        data: {
          firstName,
          lastName,
          club,
          uciId,
          email,
          phone
        }
      });

      return res.status(201).json(rider);
    } catch (error: any) {
      console.error('Error creating rider:', error);
      
      if (error.code === 'P2002') {
        return res.status(409).json({ error: 'Rider already exists' });
      }
      
      return res.status(500).json({ error: 'Failed to create rider' });
    }
  }

  if (req.method === 'PUT') {
    try {
      const { id, firstName, lastName, club, uciId, email, phone } = req.body;

      if (!id) {
        return res.status(400).json({ error: 'id is required' });
      }

      const rider = await prisma.rider.update({
        where: { id },
        data: {
          firstName,
          lastName,
          club,
          uciId,
          email,
          phone
        }
      });

      return res.status(200).json(rider);
    } catch (error) {
      console.error('Error updating rider:', error);
      return res.status(500).json({ error: 'Failed to update rider' });
    }
  }

  if (req.method === 'DELETE') {
    try {
      const { id } = req.query;

      if (!id || typeof id !== 'string') {
        return res.status(400).json({ error: 'id is required' });
      }

      await prisma.rider.delete({
        where: { id }
      });

      return res.status(204).end();
    } catch (error) {
      console.error('Error deleting rider:', error);
      return res.status(500).json({ error: 'Failed to delete rider' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
