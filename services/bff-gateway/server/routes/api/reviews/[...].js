import { defineEventHandler } from 'h3'
import { proxy } from '../../../utils/proxy.js'

export default defineEventHandler((event) => proxy(event, process.env.SOCIAL_SERVICE_URL))
