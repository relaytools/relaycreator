import type { Link } from "./content";
import { linkIcons } from "./icons";
import { FiArrowRight } from "react-icons/fi";

type Props = {
    link: Link;
    variant?: "primary" | "ghost";
    size?: "sm" | "md" | "lg";
    /** show a trailing arrow when the link has no icon of its own */
    arrow?: boolean;
    className?: string;
};

export function ctaClass(variant: Props["variant"] = "primary", size: Props["size"] = "md") {
    return [
        "landing-btn",
        variant === "ghost" ? "landing-btn-ghost" : "",
        size === "lg" ? "landing-btn-lg" : size === "sm" ? "landing-btn-sm" : "",
    ]
        .filter(Boolean)
        .join(" ");
}

export default function CtaButton({ link, variant = "primary", size = "md", arrow, className = "" }: Props) {
    const Icon = link.icon ? linkIcons[link.icon] : arrow ? FiArrowRight : null;
    const iconSize = size === "lg" ? 20 : size === "sm" ? 14 : 18;
    return (
        <a
            href={link.href}
            target={link.external ? "_blank" : undefined}
            rel={link.external ? "noopener noreferrer" : undefined}
            className={`${ctaClass(variant, size)} ${className}`}
        >
            {link.label}
            {Icon && <Icon size={iconSize} />}
        </a>
    );
}
