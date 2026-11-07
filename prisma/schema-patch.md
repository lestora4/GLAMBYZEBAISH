# Prisma schema changes

In `prisma/schema.prisma`, find the `Payment` model and change it from:

```prisma
model Payment {
  id            String   @id @default(cuid())
  orderId       String   @unique
  amount        Float
  currency      String   @default("INR")
  paymentId     String
  orderIdRazorpay String?
  signature     String?
  status        PaymentStatus @default(PENDING)
  method        String?
  refundId      String?
  refundAmount  Float?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  order         Order    @relation(fields: [orderId], references: [id])

  @@map("payments")
}
```

to:

```prisma
model Payment {
  id              String   @id @default(cuid())
  orderId         String   @unique
  amount          Float
  currency        String   @default("INR")
  paymentId       String
  orderIdRazorpay String?  // kept, unused now — harmless to leave
  signature       String?  // kept, unused now — harmless to leave
  merchantOrderId String?  @unique // NEW: PhonePe's merchantOrderId
  gateway         String   @default("PHONEPE") // NEW: which gateway processed this
  status          PaymentStatus @default(PENDING)
  method          String?
  refundId        String?
  refundAmount    Float?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  order           Order    @relation(fields: [orderId], references: [id])

  @@map("payments")
}
```

Only two fields are actually new: `merchantOrderId` and `gateway`. The Razorpay
fields are left in place (nullable, so no data loss) in case you ever want to
support both gateways later — they just won't be written to anymore.

Then run:

```bash
npx prisma migrate dev --name add_phonepe_fields
```

This generates and applies the migration, and regenerates the Prisma client.
