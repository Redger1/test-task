// Мы ожидаем, что Вы исправите синтаксические ошибки, сделаете перехват возможных исключений и улучшите читаемость кода.
// + А так же, напишите кастомный хук useThrottle и используете его там где это нужно.
// + Желательно использование React.memo и React.useCallback там где это имеет смысл.
// + Будет большим плюсом, если Вы сможете закэшировать получение случайного пользователя.
// + Укажите правильные типы.
// По возможности пришлите Ваш вариант в https://codesandbox.io

import React, { useEffect, useRef, useState } from "react"

const URL = "https://jsonplaceholder.typicode.com/users"

type Company = {
	bs: string
	catchPhrase: string
	name: string
}

// Добавил тип UsersAddress, чтобы избавиться от `any`
type UsersAddress = {
	street: string
	suite: string
	city: string
	zipcode: string
	geo: {
		lat: string
		lng: string
	}
}

type User = {
	id: number
	email: string
	name: string
	phone: string
	username: string
	website: string
	company: Company
	address: UsersAddress
}

// Добавил тип метода onClick
interface IButtonProps {
	onClick: (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void
}

// Добавил `memo`, чтобы избавиться от ненужных ререндеров компоненты кнопки
const Button = React.memo(
	({ onClick }: IButtonProps): JSX.Element => (
		<button type="button" onClick={onClick}>
			get random user
		</button>
	)
)

interface IUserInfoProps {
	user: User | null
}

function UserInfo({ user }: IUserInfoProps): JSX.Element {
	// Добавил проверку на существование user: если нам не придет user, то выводим ошибку
	return user ? (
		<table>
			<thead>
				<tr>
					<th>Username</th>
					<th>Phone number</th>
				</tr>
			</thead>
			<tbody>
				<tr>
					<td>{user.name}</td>
					<td>{user.phone}</td>
				</tr>
			</tbody>
		</table>
	) : (
		<p>
			Cannot find <i>Users</i> data
		</p>
	)
}

// Структуры Map для хранения кэшированных данных пользователей по ключу = userId
const usersDataCacheMap: Map<string, Promise<User | null>> = new Map()

function App(): JSX.Element {
	// Исправил тип item: здесь не нужен Record, так как из запроса приходит обычный объект
	// Добавил типа null для item, так как начального значения до API запроса у нас нет
	const [item, setItem] = useState<User | null>(null)
	const userInfo = useThrottle(item, 500)

	// Добавил try...catch для обработки ошибки при неудачном запросе
	const receiveRandomUser = async (userId: string) => {
		try {
			const response = await fetch(`${URL}/${userId}`, { cache: "force-cache" })
			if (!response.ok) throw new Error("Cannot find user with id " + userId)

			return (await response.json()) as User
		} catch (error: unknown) {
			console.error(error)
			return null
		}
	}

	// Если такой ключ существует в структуре Map, то мы получаем его значение
	// Иначе - делаем API запрос и сразу его кэшируем
	const getUsersDataById = async (userId: string) => {
		try {
			if (!usersDataCacheMap.has(userId)) {
				const newUsersData = receiveRandomUser(userId)
				usersDataCacheMap.set(userId, newUsersData)
			}
			return usersDataCacheMap.get(userId)
		} catch (error) {
			console.error(error)
			return null
		}
	}

	// Получение данных из API либо из кэша
	async function makeCachedRequest() {
		try {
			const id = Math.floor(Math.random() * (10 - 1)) + 1
			const data = await getUsersDataById(id.toString())

			data ? setItem(data) : setItem(null)
		} catch (error: unknown) {
			console.error(error)
		}
	}

	const handleButtonClick = React.useCallback((event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
		event.stopPropagation()
		makeCachedRequest()
	}, [])

	return (
		<div>
			<header>Get a random user</header>
			<Button onClick={handleButtonClick} />
			<UserInfo user={userInfo} />
		</div>
	)
}

// Реализовал хук `useThrottle` для изменения ренедера данных раз в `interval` (по умолчанию 1 секунда)
function useThrottle<T>(value: T, interval: number = 1000) {
	const [throttledValue, setThrottledValue] = useState<T>(value)
	const lastCall = useRef<number>(Date.now())

	useEffect(() => {
		if (Date.now() >= lastCall.current + interval) {
			lastCall.current = Date.now()
			setThrottledValue(value)
		} else {
			const timer = setTimeout(() => {
				lastCall.current = Date.now()
				setThrottledValue(value)
			}, interval)

			return () => clearTimeout(timer)
		}
	}, [value, interval])

	return throttledValue
}

export default App
