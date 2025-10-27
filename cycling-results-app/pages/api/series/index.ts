import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const series = await prisma.series.findMany({
        include: {
          events: {
            select: {
              id: true,
              name: true,
              date: true
            },
            orderBy: {
              date: 'asc'
            }
          },
          _count: {
            select: {
              events: true,
              standings: true
            }
          }
        },
        orderBy: {
          name: 'asc'
        }
      });

      return res.status(200).json(series);
    } catch (error) {
      console.error('Error fetching series:', error);
      return res.status(500).json({ error: 'Failed to fetch series' });
    }
  }

  if (req.method === 'POST') {
    try {
      const { name, description, pointSystemType, customPoints, teamBased, active } = req.body;

      if (!name || !pointSystemType) {
        return res.status(400).json({ error: 'name and pointSystemType are required' });
      }

      const series = await prisma.series.create({
        data: {
          name,
          description,
          pointSystemType,
          customPoints: customPoints || [],
          teamBased: teamBased || false,
          active: active !== undefined ? active : true
        }
      });

      return res.status(201).json(series);
    } catch (error: any) {
      console.error('Error creating series:', error);
      
      if (error.code === 'P2002') {
        return res.status(409).json({ error: 'Series with this name already exists' });
      }
      
      return res.status(500).json({ error: 'Failed to create series' });
    }
  }

  if (req.method === 'PUT') {
    try {
      const { id, name, description, pointSystemType, customPoints, teamBased, active } = req.body;

      if (!id) {
        return res.status(400).json({ error: 'id is required' });
      }

      const series = await prisma.series.update({
        where: { id },
        data: {
          name,
          description,
          pointSystemType,
          customPoints,
          teamBased,
          active
        }
      });

      return res.status(200).json(series);
    } catch (error) {
      console.error('Error updating series:', error);
      return res.status(500).json({ error: 'Failed to update series' });
    }
  }

  if (req.method === 'DELETE') {
    try {
      const { id } = req.query;

      if (!id || typeof id !== 'string') {
        return res.status(400).json({ error: 'id is required' });
      }

      await prisma.series.delete({
        where: { id }
      });

      return res.status(204).end();
    } catch (error) {
      console.error('Error deleting series:', error);
      return res.status(500).json({ error: 'Failed to delete series' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
