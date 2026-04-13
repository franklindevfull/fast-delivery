import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
const prisma = new PrismaClient()

async function main() {
  const adminEmail = 'admin@admin.com'

  const hashedPassword = await bcrypt.hash('admin123', 10)

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      password: hashedPassword,
      permissions: [
        'engagement',
        'dashboard',
        'pos',
        'sales-monitor',
        'tables',
        'kitchen',
        'crm',
        'inventory',
        'logistics',
        'qrcodes',
        'settings',
        'delivery-orders',
        'receivables',
        'reports'
      ]
    },
    create: {
      email: adminEmail,
      name: 'Administrador Master',
      password: hashedPassword,
      recoveryCode: 'ADMIN1',
      mustChangePassword: false,
      permissions: [
        'engagement',
        'dashboard',
        'pos',
        'sales-monitor',
        'tables',
        'kitchen',
        'crm',
        'inventory',
        'logistics',
        'qrcodes',
        'settings',
        'delivery-orders',
        'receivables',
        'reports'
      ]
    },
  })

  // Create Admin as a Waiter as well
  await prisma.waiter.upsert({
    where: { email: adminEmail },
    update: { name: 'Admin', active: true },
    create: {
      name: 'Admin',
      email: adminEmail,
      phone: '(00) 00000-0000',
      active: true
    }
  })

  console.log({ admin })
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
