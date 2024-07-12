import { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from 'zod';
import { prisma } from "../lib/prisma";
import { ClientError } from "../errors/client-error";

export async function getParticipantsDetails(app: FastifyInstance) {
    app.withTypeProvider<ZodTypeProvider>().get('/participants/:participantsId', {
        schema: {
            params: z.object({
                participantsId: z.string().uuid()
            }),
        }
    }, async (request, reply) => {
        const { participantsId } = request.params;

        const participans = await prisma.participant.findUnique({
            select: {
                id: true,
                name: true,
                email: true,
                is_confirmed: true
            },
            where: { id: participantsId },
        });

        if (!participans) {
            throw new ClientError('Participan not found')
        }

        return {
            participans
        };
    });
}
