import { Resend } from 'resend';
import { CustomError } from '../utils/CustomError.js';

const resendAPIKEY = process.env.resendAPIKEY || '';

const resend = new Resend(resendAPIKEY);

export const sendEmail = async (to: string, subject: string, html: string) => {
  try {
    await resend.emails.send({
      from: 'no-reply@raglife.com',
      to,
      subject,
      html,
    });
  } catch (e) {
    let message = `Failed to send email to ${to}`;
    throw new CustomError(message,sendEmail.name,e)
  }
};
