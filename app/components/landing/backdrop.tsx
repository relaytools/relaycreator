// Full-viewport animated backdrop: faint grid + three drifting colour glows.
// Sits behind everything (fixed, -z-10) and ignores pointer events.
export default function Backdrop() {
    return (
        <div aria-hidden className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
            <div className="landing-page-bg absolute inset-0" />
            <div className="landing-backdrop absolute inset-0" />
            <div className="landing-glow landing-glow-1 w-[max(55vw,480px)] h-[max(55vw,480px)] -top-[18vw] -left-[15vw]" />
            <div className="landing-glow landing-glow-2 w-[max(48vw,420px)] h-[max(48vw,420px)] top-[35vh] -right-[22vw]" />
            <div className="landing-glow landing-glow-3 w-[max(40vw,360px)] h-[max(40vw,360px)] top-[120vh] left-[15vw]" />
        </div>
    );
}
