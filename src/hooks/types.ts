import { Profile } from '../lib/supabase'

export interface Friend {
  id: string
  user_id: string
  username: string
  avatar: string
}

export interface Notification {
  id: string
  friend_id: string
  friend_username: string
  avatar: string
  created_at: string
}

export interface ReactionCounts {
  thumbs_up: number
  heart: number
  poop: number
  userReaction?: string
}

export interface Comment {
  id: string
  user_id: string
  username: string
  avatar: string
  text: string
  created_at: string
}

export interface Event {
  id: string
  user_id: string
  created_at: string
  bristol_type?: number
  profiles?: {
    id: string
    username: string
    email?: string | null
    avatar: string
  }
}