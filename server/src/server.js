import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import { createServer } from 'http'
import path from 'path'
import { fileURLToPath } from 'url'
import 'dotenv/config'

import { initIO } from './io.js'
import { errorHandler } from './middleware/errorHandler.js'

import authRoutes from './routes/auth.routes.js'
import settingsRoutes from './routes/settings.routes.js'
import classesRoutes from './routes/classes.routes.js'
import studentsRoutes from './routes/students.routes.js'
import paymentsRoutes from './routes/payments.routes.js'
import expensesRoutes from './routes/expenses.routes.js'
import cashClosuresRoutes from './routes/cash_closures.routes.js'
import remindersRoutes from './routes/reminders.routes.js'
import teachersRoutes from './routes/teachers.routes.js'
import teacherHoursRoutes from './routes/teacher_hours.routes.js'
import staffRoutes from './routes/staff.routes.js'
import staffPaymentsRoutes from './routes/staff_payments.routes.js'
import debtsRoutes from './routes/debts.routes.js'
import documentsRoutes from './routes/documents.routes.js'
import auditLogsRoutes from './routes/audit_logs.routes.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const app = express()
const httpServer = createServer(app)

const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:5173'

app.use(
  helmet({
    crossOriginResourcePolicy: {
      policy: 'cross-origin',
    },
  })
)

app.use(
  cors({
    origin: corsOrigin,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
)

app.use(express.json({ limit: '10mb' }))

// ─── Fichiers statiques — photos élèves ────────────────────────────────────────
app.use('/uploads', express.static(path.join(__dirname, '../../uploads')))

app.get('/api/health', (req, res) => res.json({ ok: true, name: 'gesfinancelites-api' }))

app.use('/api/auth', authRoutes)
app.use('/api/settings', settingsRoutes)
app.use('/api/classes', classesRoutes)
app.use('/api/students', studentsRoutes)
app.use('/api/payments', paymentsRoutes)
app.use('/api/expenses', expensesRoutes)
app.use('/api/cash_closures', cashClosuresRoutes)
app.use('/api/reminders', remindersRoutes)
app.use('/api/teachers', teachersRoutes)
app.use('/api/teacher_hours', teacherHoursRoutes)
app.use('/api/staff', staffRoutes)
app.use('/api/staff_payments', staffPaymentsRoutes)
app.use('/api/debts', debtsRoutes)
app.use('/api/documents', documentsRoutes)
app.use('/api/audit_logs', auditLogsRoutes)

app.use((req, res) => res.status(404).json({ error: 'Ressource introuvable.' }))
app.use(errorHandler)

initIO(httpServer, corsOrigin)

const PORT = process.env.PORT || 4000
httpServer.listen(PORT, () => {
  console.log(`✅ API gesfinancelites démarrée sur le port ${PORT}`)
})
