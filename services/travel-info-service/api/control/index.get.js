// GET /api/control — workflow status for the warning + weather pollers.
import { control } from '../../utils/control.js'

export default defineEventHandler(() => control)
