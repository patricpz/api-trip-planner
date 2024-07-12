import { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from 'zod';
import { prisma } from "../lib/prisma";
import { getMailClient } from "../lib/mail";
import nodemailer from 'nodemailer';
import { dayjs } from "../lib/dayjs";
import { ClientError } from "../errors/client-error";
import { env } from "../env";



export async function createTrip(app: FastifyInstance) {
    app.withTypeProvider<ZodTypeProvider>().post('/trips', {
        schema: {
            body: z.object({
                destination: z.string().min(4),
                start_at: z.coerce.date(),
                end_at: z.coerce.date(),
                ower_name: z.string(),
                ower_email: z.string().email(),
                emails_to_invite: z.array(z.string().email())
            })
        }
    }, async (request, reply) => {
        const { destination, start_at, end_at, ower_name, ower_email, emails_to_invite } = request.body;

        if (dayjs(start_at).isBefore(new Date())) {
            throw new ClientError("Invalid date start-at");
        }

        if (dayjs(end_at).isBefore(start_at)) {
            throw new ClientError("Invalid date end-at");
        }


        const trip = await prisma.trip.create({
            data: {
                destination,
                start_at,
                end_at,
                participant: {
                    createMany: {
                        data: [
                            {
                                name: ower_name,
                                email: ower_email,
                                is_ower: true,
                                is_confirmed: true
                            },
                            ...emails_to_invite.map(email => ({
                                email
                            }))

                        ]
                    }
                }
            }
        });

        const formatStartDate = dayjs(start_at).format('LL')
        const formatEndDate = dayjs(end_at).format('LL')

        const confirmationLink = `${env.API_BASE_URL}/trips/${trip.id}/confirm`



        const mail = await getMailClient();

        const message = await mail.sendMail({
            from: {
                name: 'Equipe plann.er',
                address: 'oi@plan.er'
            },
            to: {
                name: ower_name,
                address: ower_email,
            },
            subject: 'Testando email',
            html: `
                <!DOCTYPE html>
                <html lang="pt-BR">
                <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Confirmação de Viagem</title>
                <style>
                body {
                font-family: Arial, sans-serif;
                line-height: 1.6;
                color: #333;
                margin: 0;
                padding: 0;
                background-color: #f4f4f4;
                }
                .container {
                max-width: 600px;
                margin: 20px auto;
                background: #fff;
                padding: 20px;
                border-radius: 8px;
                box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
                }
                .header {
                text-align: center;
                border-bottom: 1px solid #ddd;
                padding-bottom: 10px;
                margin-bottom: 20px;
                }
                .header h1 {
                margin: 0;
                color: #0073e6;
                }
                .content {
                line-height: 1.6;
                }
                .content p {
                margin: 10px 0;
                }
                .footer {
                text-align: center;
                border-top: 1px solid #ddd;
                padding-top: 10px;
                margin-top: 20px;
                font-size: 0.9em;
                color: #666;
                }
                .footer p {
                margin: 5px 0;
                }
                </style>
                </head>
                <body>
                <div class="container">
                <div class="header">
                <h1>Confirmação de Viagem</h1>
                </div>
                <div class="content">
                <p>Olá <strong>${ower_name}</strong>,</p>
                <p>Estamos felizes em informar que seu plano de viagem para <strong>${destination}</strong> foi criado com sucesso!</p>
                <p><strong>Detalhes da Viagem:</strong></p>
                <ul>
                <li><strong>Destino:</strong> ${destination}</li>
                <li><strong>Data de Início:</strong> ${formatStartDate}</li>
                <li><strong>Data de Término:</strong> ${formatEndDate}</li>
                </ul>
                <p>
                <a href="${confirmationLink}">Confirm aqui </a>
                </p>
                <p>Obrigado por usar nosso serviço de planejamento de viagens.</p>
                <p>Atenciosamente,</p>
                <p>Equipe plann.er</p>
                </div>
                <div class="footer">
                <p>&copy; 2024 plann.er. Todos os direitos reservados.</p>
                <p>Se você não solicitou este e-mail, por favor, ignore-o.</p>
                </div>
                </div>
                </body>
                </html>

            `.trim()
        });

        console.log(nodemailer.getTestMessageUrl(message));

        return {
            tripId: trip.id
        };
    });
}
