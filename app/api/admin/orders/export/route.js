export const dynamic = 'force-dynamic'; 
 
import { PrismaClient } from '@prisma/client';
import { verifyAdmin } from '@/lib/auth';

const prisma = new PrismaClient();

export async function GET(req) {
  try {
    const admin = await verifyAdmin(req);
    if (!admin) {
      return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const orders = await prisma.order.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        customer: { select: { name: true, email: true, phone: true } },
        package: { select: { name: true, price: true } },
        artist: { select: { name: true, phone: true } },
        payment: { select: { status: true, amount: true, paymentId: true } },
      },
    });

    // Create CSV
    let csv = 'Order #,Customer,Email,Phone,Package,Date,Time,Location,Amount,Status,Payment Status,Artist\n';
    orders.forEach(o => {
      csv += `${o.orderNumber},${o.customer?.name || 'Guest'},${o.customer?.email || ''},${o.customer?.phone || ''},${o.package?.name || ''},${o.date ? new Date(o.date).toLocaleDateString() : ''},${o.time || ''},${o.location || ''},${o.totalAmount || 0},${o.status},${o.paymentStatus},${o.artist?.name || 'Not Assigned'}\n`;
    });

    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename=orders-${new Date().toISOString().split('T')[0]}.csv`,
      },
    });
  } catch (error) {
    console.error('Export error:', error);
    return Response.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}