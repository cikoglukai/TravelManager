import { defineEventHandler } from 'h3'
import { proxy } from '../../../utils/proxy.js'

export default defineEventHandler((event) => proxy(event, process.env.DESTINATION_SERVICE_URL))
