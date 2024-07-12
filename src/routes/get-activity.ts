import { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from 'zod';
import { prisma } from "../lib/prisma";
import { getMailClient } from "../lib/mail";
import nodemailer from 'nodemailer';
import { dayjs } from "../lib/dayjs";
import { ClientError } from "../errors/client-error";

export async function getActivity(app: FastifyInstance) {
    app.withTypeProvider<ZodTypeProvider>().get('/trips/:tripId/activities', {
        schema: {
            params: z.object({
                tripId: z.string().uuid()
            }),
        }
    }, async (request, reply) => {
        const { tripId } = request.params;

        const trip = await prisma.trip.findUnique({
            where: { id: tripId },
            include: { activity: {
                orderBy: {
                    occurs_at: 'asc'
                }
            } }
        });

        if (!trip) {
            throw new ClientError('Trip not found' );
        }

        const differenceInDaysBetweenTripStartAndEnd = dayjs(trip.end_at).diff(trip.start_at, 'days')

        const activities = Array.from({length: differenceInDaysBetweenTripStartAndEnd + 1}).map((_, index) => {
            const date = dayjs(trip.start_at).add(index, 'days')

            return {
                date: date.toDate(),
                activities: trip.activity.filter(activities => {
                    return dayjs(activities.occurs_at).isSame(date, 'day')
                })
            }
        })

        return {
            activities
        };
    });
}
