export interface User {
  id: string
  name: string
  avatar: string
  bio: string
  poopCount: number
  isFollowing?: boolean
  isFollower?: boolean
}

export const ALL_USERS: User[] = [
  { id: 'u1', name: 'Алексей', avatar: '👨‍💼', bio: 'Бизнесмен и кофеман', poopCount: 42 },
  { id: 'u2', name: 'Мария', avatar: '👩‍🎨', bio: 'Художница, веган', poopCount: 128 },
  { id: 'u3', name: 'Дмитрий', avatar: '🧑‍🚀', bio: 'Мечтаю о Марсе', poopCount: 15 },
  { id: 'u4', name: 'Елена', avatar: '👩‍⚕️', bio: 'Врач-проктолог 😅', poopCount: 89 },
  { id: 'u5', name: 'Игорь', avatar: '🧔', bio: 'Качок, ем 6 раз в день', poopCount: 256 },
  { id: 'u6', name: 'Ольга', avatar: '👩‍🏫', bio: 'Учительница на пенсии', poopCount: 34 },
  { id: 'u7', name: 'Никита', avatar: '🧑‍💻', bio: 'Программист, сижу 24/7', poopCount: 512 },
  { id: 'u8', name: 'Анна', avatar: '👱‍♀️', bio: 'Блогер, лайфстайл', poopCount: 67 },
  { id: 'u9', name: 'Сергей', avatar: '👨‍🍳', bio: 'Шеф-повар, дегустатор', poopCount: 201 },
  { id: 'u10', name: 'Виктория', avatar: '💃', bio: 'Танцую и какаю', poopCount: 78 },
  { id: 'u11', name: 'Павел', avatar: '🧑‍🔧', bio: 'Мастер на все руки', poopCount: 45 },
  { id: 'u12', name: 'Кристина', avatar: '👩‍🎤', bio: 'Рок-звезда 🎸', poopCount: 99 },
  { id: 'u13', name: 'Андрей', avatar: '🏃', bio: 'Марафонец', poopCount: 33 },
  { id: 'u14', name: 'Татьяна', avatar: '👩‍🌾', bio: 'Фермерша', poopCount: 156 },
  { id: 'u15', name: 'Максим', avatar: '🎮', bio: 'Геймер, стример', poopCount: 444 },
  { id: 'u16', name: 'Юлия', avatar: '🧘‍♀️', bio: 'Йога, медитация, 💩', poopCount: 22 },
  { id: 'u17', name: 'Роман', avatar: '🕵️', bio: 'Детектив, наблюдаю', poopCount: 77 },
  { id: 'u18', name: 'Светлана', avatar: '👩‍🔬', bio: 'Учёный, изучаю процесс', poopCount: 111 },
  { id: 'u19', name: 'Владимир', avatar: '🧓', bio: 'Дедушка с опытом', poopCount: 999 },
  { id: 'u20', name: 'Дарья', avatar: '🦸‍♀️', bio: 'Супергеройня', poopCount: 55 },
]

// Fake followers (people following you)
export const FAKE_FOLLOWERS: User[] = [
  { id: 'f1', name: 'Мама', avatar: '👩', bio: 'Всегда переживает', poopCount: 1234, isFollower: true },
  { id: 'f2', name: 'Братан', avatar: '🧔', bio: 'Завидую втайне', poopCount: 567, isFollower: true },
  { id: 'f3', name: 'Коллега Серёга', avatar: '👨‍💻', bio: 'Работаем вместе', poopCount: 234, isFollower: true },
  { id: 'f4', name: 'Бывшая', avatar: '💅', bio: 'Зачем я подпислась...', poopCount: 89, isFollower: true },
  { id: 'f5', name: 'Начальник', avatar: '🤵', bio: 'Слежу за KPI 💩', poopCount: 12, isFollower: true },
  { id: 'f6', name: 'Кот', avatar: '🐱', bio: 'Мяу', poopCount: 9999, isFollower: true },
  { id: 'f7', name: 'Бот Олег', avatar: '🤖', bio: 'Бип-буп', poopCount: 0, isFollower: true },
]

// Fake following (people you follow)
export const FAKE_FOLLOWING: User[] = [
  { id: 'g1', name: 'Доставка еды', avatar: '🛵', bio: 'Приезжаю быстро', poopCount: 0, isFollowing: true },
  { id: 'g2', name: 'Батя', avatar: '👴', bio: 'Старая школа', poopCount: 4321, isFollowing: true },
  { id: 'g3', name: 'Лучшая подруга', avatar: '👧', bio: 'Поделимся всем', poopCount: 456, isFollowing: true },
  { id: 'g4', name: 'Тренер', avatar: '🏋️', bio: 'Следит за регулярностью', poopCount: 78, isFollowing: true },
  { id: 'g5', name: 'Сосед', avatar: '🧑‍🦰', bio: 'Слышу всё через стену', poopCount: 90, isFollowing: true },
]
