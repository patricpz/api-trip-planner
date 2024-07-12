import { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from 'zod';
import { prisma } from "../lib/prisma";
import { getMailClient } from "../lib/mail";
import nodemailer from 'nodemailer';
import { dayjs } from "../lib/dayjs";
import { ClientError } from "../errors/client-error";

export async function createLink(app: FastifyInstance) {
    app.withTypeProvider<ZodTypeProvider>().post('/trips/:tripId/links', {
        schema: {
            params: z.object({
                tripId: z.string().uuid()
            }),
            body: z.object({
                title: z.string().min(4),
                url: z.string().url(),
            })
        }
    }, async (request, reply) => {
        const { tripId } = request.params;
        const { title, url } = request.body;

        const trip = await prisma.trip.findUnique({
            where: { id: tripId }
        });

        if (!trip) {
            throw new ClientError('Trip not found' );
        }


        const links = await prisma.link.create({
            data: {
                title,
                url,
                trip_id: tripId
            }
        });

        return {
            linkId: links.id
        };
    });
}
