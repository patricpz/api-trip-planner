import fastify from 'fastify';
import { serializerCompiler, validatorCompiler } from 'fastify-type-provider-zod';
import { confirmTrip } from './routes/confirm-trip';
import cors from '@fastify/cors'
import { confirmParticipant } from './routes/confirm-participant';
import { createActivity } from './routes/create-activity';
import { getActivity } from './routes/get-activity';
import { createLink } from './routes/create-link';
import { getLinks } from './routes/get-link';
import { getParticipants } from './routes/get-participans';
import { createInvite } from './routes/create-invite';
import { createTrip } from './routes/create-trip';
import { updateTrip } from './routes/update-trip';
import { getTripDetails } from './routes/get-trip-details';
import { getParticipantsDetails } from './routes/get-participants-details';
import { errorHandler } from './error-handle';
import { env } from './env';

const app = fastify();

app.register(cors, {
    origin: '*',
})

app.setErrorHandler(errorHandler)

app.setValidatorCompiler(validatorCompiler);
app.setSerializerCompiler(serializerCompiler);

app.register(createTrip)
app.register(confirmTrip)
app.register(confirmParticipant)
app.register(createActivity)
app.register(getActivity)
app.register(createLink)
app.register(getLinks)
app.register(getParticipants)
app.register(createInvite)
app.register(updateTrip)
app.register(getTripDetails)
app.register(getParticipantsDetails)

app.listen({ port: env.PORT }).then(() => {
    console.log('Server is running on port 3333');
});
