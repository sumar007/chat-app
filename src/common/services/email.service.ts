import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor(private config: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.config.get('SMTP_HOST'),
      port: parseInt(this.config.get('SMTP_PORT') || '587'),
      secure: false,
      auth: {
        user: this.config.get('SMTP_USER'),
        pass: this.config.get('SMTP_PASS'),
      },
    });
  }

  async sendVerificationEmail(email: string, code: string, name: string) {
    const mailOptions = {
      from: this.config.get('FROM_EMAIL'),
      to: email,
      subject: 'Verify Your Email - Chat App',
      html: `
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2>Welcome ${name}!</h2>
          <p>Thank you for signing up. Please verify your email address by using the code below:</p>
          <div style="background: #f5f5f5; padding: 20px; text-align: center; margin: 20px 0;">
            <h1 style="color: #333; font-size: 32px; margin: 0;">${code}</h1>
          </div>
          <p>This code will expire in 15 minutes.</p>
          <p>If you didn't create this account, please ignore this email.</p>
        </div>
      `,
    };
console.log('Sending email to:', email);
    console.log('Email content:', mailOptions);
    return this.transporter.sendMail(mailOptions);
  }
}
