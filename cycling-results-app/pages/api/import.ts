import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { calculatePoints } from '@/lib/points';
import Papa from 'papaparse';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb'
    }
  }
};

interface ImportRow {
  firstName: string;
  lastName: string;
  club: string;
  uciId?: string;
  className: string;
  position: number;
  email?: string;
  phone?: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { csvData, seriesId, eventName, eventDate } = req.body;

    if (!csvData || !seriesId || !eventName) {
      return res.status(400).json({ error: 'csvData, seriesId, and eventName are required' });
    }

    // Hämta serie för att få poängsystem
    const series = await prisma.series.findUnique({
      where: { id: seriesId }
    });

    if (!series) {
      return res.status(404).json({ error: 'Series not found' });
    }

    // Parsa CSV
    const parsed = Papa.parse(csvData, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header: string) => {
        const normalized = header.toLowerCase().trim();
        const mapping: Record<string, string> = {
          'förnamn': 'firstName',
          'firstname': 'firstName',
          'first name': 'firstName',
          'efternamn': 'lastName',
          'lastname': 'lastName',
          'last name': 'lastName',
          'klubb': 'club',
          'förening': 'club',
          'club': 'club',
          'klass': 'className',
          'class': 'className',
          'kategori': 'className',
          'placering': 'position',
          'position': 'position',
          'place': 'position',
          'uci-id': 'uciId',
          'uci': 'uciId',
          'uci id': 'uciId',
          'e-post': 'email',
          'email': 'email',
          'mail': 'email',
          'telefon': 'phone',
          'phone': 'phone',
          'tel': 'phone'
        };
        return mapping[normalized] || normalized;
      }
    });

    if (parsed.errors.length > 0) {
      return res.status(400).json({ error: 'Failed to parse CSV', details: parsed.errors });
    }

    const rows = parsed.data as ImportRow[];
    
    // Skapa eller hitta event
    let event = await prisma.event.findFirst({
      where: {
        seriesId,
        name: eventName
      }
    });

    if (!event) {
      event = await prisma.event.create({
        data: {
          name: eventName,
          date: eventDate ? new Date(eventDate) : null,
          seriesId,
          published: false
        }
      });
    }

    const results = [];
    const createdRiders = [];
    const errors = [];

    for (const row of rows) {
      try {
        if (!row.firstName || !row.lastName || !row.className || !row.position) {
          errors.push({ row, error: 'Missing required fields' });
          continue;
        }

        // Försök hitta befintlig rider
        let rider = null;

        // Först kolla UCI ID om det finns
        if (row.uciId && !row.uciId.startsWith('TEMP')) {
          rider = await prisma.rider.findUnique({
            where: { uciId: row.uciId }
          });
        }

        // Annars sök på namn och klubb
        if (!rider) {
          rider = await prisma.rider.findFirst({
            where: {
              firstName: {
                equals: row.firstName,
                mode: 'insensitive'
              },
              lastName: {
                equals: row.lastName,
                mode: 'insensitive'
              },
              club: row.club ? {
                equals: row.club,
                mode: 'insensitive'
              } : undefined,
              mergedIntoId: null
            }
          });
        }

        // Skapa ny rider om ingen hittades
        if (!rider) {
          rider = await prisma.rider.create({
            data: {
              firstName: row.firstName,
              lastName: row.lastName,
              club: row.club || null,
              uciId: row.uciId || null,
              email: row.email || null,
              phone: row.phone || null
            }
          });
          createdRiders.push(rider);
        } else if (row.email || row.phone) {
          // Uppdatera kontaktinfo om det finns
          rider = await prisma.rider.update({
            where: { id: rider.id },
            data: {
              email: row.email || rider.email,
              phone: row.phone || rider.phone
            }
          });
        }

        // Beräkna poäng
        const points = calculatePoints(
          row.position,
          series.pointSystemType as any,
          series.customPoints
        );

        // Skapa eller uppdatera resultat
        const result = await prisma.result.upsert({
          where: {
            eventId_riderId_className: {
              eventId: event!.id,
              riderId: rider.id,
              className: row.className
            }
          },
          update: {
            position: row.position,
            points
          },
          create: {
            eventId: event!.id,
            riderId: rider.id,
            className: row.className,
            position: row.position,
            points
          }
        });

        results.push(result);
      } catch (error) {
        errors.push({ row, error: String(error) });
      }
    }

    return res.status(200).json({
      success: true,
      event,
      resultsImported: results.length,
      ridersCreated: createdRiders.length,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    console.error('Error importing results:', error);
    return res.status(500).json({ error: 'Failed to import results' });
  }
}
