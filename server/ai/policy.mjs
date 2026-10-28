import { object, text, list, attachment, HttpError } from './security.mjs';
export function validate(body) {
  object(body, ['operation', 'input']);
  const { operation, input } = body;
  let cost = 1;

  if (operation === 'process') {
    object(input, ['transcript']); text(input.transcript, 12000);
    cost = Math.ceil(input.transcript.length / 1600) + 2;
  } else if (operation === 'chunks') {
    object(input, ['meetingId', 'meetingTitle', 'date', 'transcript']);
    text(input.meetingId, 128); text(input.meetingTitle, 200); text(input.date, 50); text(input.transcript, 12000);
    cost = Math.ceil(input.transcript.length / 800);
  } else if (operation === 'embedding') { object(input, ['text']); text(input.text, 2000); }
  else if (operation === 'query') { object(input, ['query', 'context']); text(input.query, 2000); text(input.context, 16000); }
  else throw new HttpError(400, 'Unsupported AI operation.');

  return { operation, input, cost, stream: operation === 'chat' };
}
