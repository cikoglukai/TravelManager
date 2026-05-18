import { defineEventHandler } from 'h3'
import { proxy } from '../../../utils/proxy.js'

export default defineEventHandler((event) => proxy(event, process.env.NOTIFICATION_SERVICE_URL))
