import { executeQuery } from "@/app/lib/db"

export interface ChatPair {
  userAId: number
  userBId: number
}

export function orderedPair(a: number, b: number): ChatPair {
  return a < b ? { userAId: a, userBId: b } : { userAId: b, userBId: a }
}

/**
 * Verify that `otherUserId` is a user this auth user is allowed to chat with
 * inside their school:
 *   - school_admin may chat with any teacher in the same partner
 *   - teacher may chat with the school_admin OR any other teacher in the same partner
 *
 * Returns true when the pair is valid.
 */
export async function canChatWith(params: {
  partnerUserId: number
  schoolId: number
  selfUserId: number
  otherUserId: number
}): Promise<boolean> {
  const { partnerUserId, schoolId, selfUserId, otherUserId } = params
  if (selfUserId === otherUserId) return false

  // Is the other user the school admin of this school?
  if (otherUserId === partnerUserId) return true

  // Otherwise other user must be a teacher belonging to this school.
  const rows = await executeQuery<{ id: number }[]>(
    "SELECT id FROM teachers WHERE user_id = ? AND partner_id = ? LIMIT 1",
    [otherUserId, schoolId]
  )
  return rows.length > 0
}

/** Get-or-create a thread for the pair within the given partner. Returns the thread id. */
export async function getOrCreateThread(
  partnerUserId: number,
  selfUserId: number,
  otherUserId: number
): Promise<number> {
  const { userAId, userBId } = orderedPair(selfUserId, otherUserId)

  const existing = await executeQuery<{ id: number }[]>(
    `SELECT id FROM erp_chat_threads
     WHERE partner_id = ? AND user_a_id = ? AND user_b_id = ? LIMIT 1`,
    [partnerUserId, userAId, userBId]
  )
  if (existing.length > 0) return existing[0].id

  const result = await executeQuery<{ id: number }[]>(
    `INSERT INTO erp_chat_threads
       (partner_id, user_a_id, user_b_id, created_at, updated_at)
     VALUES (?, ?, ?, NOW(), NOW())
     RETURNING id`,
    [partnerUserId, userAId, userBId]
  )
  return result[0].id
}
