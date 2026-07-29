export type NewsType = 'system' | 'general'
export type NewsRole = 'all' | 'student' | 'teacher'

export interface NewsItem {
    id: string
    title: string
    content: string
    date: string
    type: NewsType
    role?: NewsRole
}