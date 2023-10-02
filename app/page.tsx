import Relays from "./relays/page"

export default function Home() {
  return (
    <>
      {/* @ts-expect-error Server Component */}
      <Relays></Relays>

    </>
  )
}
