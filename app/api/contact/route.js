export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
import { sendContactFormEmail } from '@/lib/email';

export async function POST(req) {
  try {
    const { name, email, subject, message } = await req.json();

    if (!name || !email || !message) {
      return Response.json(
        { success: false, error: 'Name, email and message are required' },
        { status: 400 }
      );
    }

    if (!email.includes('@')) {
      return Response.json(
        { success: false, error: 'Please enter a valid email address' },
        { status: 400 }
      );
    }

    const result = await sendContactFormEmail({
      name: String(name).trim(),
      email: String(email).trim(),
      subject: subject ? String(subject).trim() : '',
      message: String(message).trim(),
    });

    if (!result.success) {
      console.error('❌ Contact form email failed:', result.error);
      return Response.json(
        { success: false, error: 'Could not send your message right now. Please try again later.' },
        { status: 500 }
      );
    }

    return Response.json({
      success: true,
      message: 'Thanks for reaching out! We will get back to you within 24 hours.',
    });
  } catch (error) {
    console.error('❌ Contact form error:', error);
    return Response.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
