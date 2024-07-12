import { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from 'zod';
import { prisma } from "../lib/prisma";
import { dayjs } from "../lib/dayjs";
import { getMailClient } from "../lib/mail";
import nodemailer from 'nodemailer'
import { ClientError } from "../errors/client-error";
import { env } from "../env";

export async function confirmTrip(app: FastifyInstance) {
    app.withTypeProvider<ZodTypeProvider>().get('/trips/:tripId/confirm', {
        schema: {
            params: z.object({
                tripId: z.string().uuid(),
            })
        }
    }, async (request, reply) => {
        const { tripId } = request.params;

        const trip = await prisma.trip.findUnique({
            where: {
                id: tripId,
            },
            include: {
                participant: {
                    where: {
                        is_ower: false,
                    }
                }
            }
        });

        if (!trip) {
            throw new ClientError('Trip not found');
        }

        if (trip.is_confirmed) {
            return reply.redirect(`${env.WEB_BASE_URL}/trips/${tripId}`);
        }

        await prisma.trip.update({
            where: { id: tripId },
            data: { is_confirmed: true },
        });

        const formatStartDate = dayjs(trip.start_at).format('LL');
        const formatEndDate = dayjs(trip.end_at).format('LL');


        const mail = await getMailClient();


        await Promise.all(
            trip.participant.map(async (participant) => {
                const confirmationLink = `${env.API_BASE_URL}/participants/${participant.id}/confirm`;

                const message = await mail.sendMail({
                    from: {
                        name: 'Equipe plann.er',
                        address: 'oi@plan.er'
                    },
                    to: participant.email,
                    subject: `Confirme sua presença na viagem para ${trip.destination} em ${formatStartDate}`,
                    html: `
                        <!DOCTYPE html>
                        <html lang="pt-BR">
                        <head>
                            <meta charset="UTF-8">
                            <meta name="viewport" content="width=device-width, initial-scale=1.0">
                            <title>Confirmação de Reserva</title>
                            <style>
                                body {
                                    font-family: Arial, sans-serif;
                                    background-color: #f4f4f4;
                                    margin: 0;
                                    padding: 0;
                                    color: #333;
                                }
                                .container {
                                    width: 100%;
                                    max-width: 600px;
                                    margin: 0 auto;
                                    background-color: #fff;
                                    padding: 20px;
                                    border-radius: 10px;
                                    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
                                }
                                h1 {
                                    color: #4CAF50;
                                }
                                p {
                                    font-size: 16px;
                                }
                                a.button {
                                    display: inline-block;
                                    padding: 10px 20px;
                                    margin: 20px 0;
                                    font-size: 16px;
                                    color: #fff;
                                    background-color: #4CAF50;
                                    border-radius: 5px;
                                    text-decoration: none;
                                }
                                a.button:hover {
                                    background-color: #45a049;
                                }
                                .footer {
                                    margin-top: 20px;
                                    font-size: 14px;
                                    color: #777;
                                }
                            </style>
                        </head>
                        <body>
                            <div class="container">
                                <h1>Reserva Confirmada</h1>
                                <p>Olá ${participant.name},</p>
                                <p>Seu pedido de reserva para a viagem de ${trip.destination} no período de ${formatStartDate} até ${formatEndDate} foi confirmado com sucesso.</p>
                                <p>Para confirmar sua presença e obter mais informações, acesse o link abaixo:</p>
                                <a href="${confirmationLink}" class="button">Confirmar Presença</a>
                                <p>Atenciosamente,</p>
                                <p>Equipe plann.er</p>
                                <div class="footer">
                                    <p>Se você não solicitou esta reserva, por favor ignore este e-mail.</p>
                                </div>
                            </div>
                        </body>
                        </html>
                    `.trim()
                });

                console.log(nodemailer.getTestMessageUrl(message))
            })
        );



        return reply.redirect(`${env.WEB_BASE_URL}/trips/${tripId}`);
    });
}
