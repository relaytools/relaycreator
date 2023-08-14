import { cookies } from 'next/headers'
import ThemeSwitcher from './themeSwitcher'
import Themes from '../../lib/themes'

// This is the component that you'll put in your page/header/any area.
export default function ThemeProvider() {
    const themeCookie = cookies().get('theme')
    const currentTheme = themeCookie ? themeCookie.value : Themes[0]
    return (<ThemeSwitcher theme={currentTheme} list={Themes} />)
}