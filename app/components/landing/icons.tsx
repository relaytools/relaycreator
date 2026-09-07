import type { IconType } from "react-icons";
import {
    FiRss, FiUsers, FiShield, FiZap, FiSearch, FiActivity, FiDatabase, FiRefreshCw,
    FiSmartphone, FiLock, FiImage, FiBookOpen, FiMessageCircle, FiGlobe, FiKey,
    FiUpload, FiCpu, FiLayers, FiEyeOff, FiGitBranch, FiTerminal, FiSliders, FiServer,
    FiExternalLink, FiDownload, FiTag,
} from "react-icons/fi";
import { SiGitlab, SiGithub, SiDocker, SiTorproject, SiKotlin } from "react-icons/si";
import { GiBee } from "react-icons/gi";
import type { IconKey, LinkIcon } from "./content";

export const featureIcons: Record<IconKey, IconType> = {
    rss: FiRss,
    users: FiUsers,
    shield: FiShield,
    zap: FiZap,
    search: FiSearch,
    activity: FiActivity,
    database: FiDatabase,
    refresh: FiRefreshCw,
    smartphone: FiSmartphone,
    lock: FiLock,
    image: FiImage,
    book: FiBookOpen,
    message: FiMessageCircle,
    globe: FiGlobe,
    key: FiKey,
    upload: FiUpload,
    cpu: FiCpu,
    layers: FiLayers,
    eyeoff: FiEyeOff,
    git: FiGitBranch,
    terminal: FiTerminal,
    sliders: FiSliders,
    server: FiServer,
    tor: SiTorproject,
    bee: GiBee,
    kotlin: SiKotlin,
};

export const linkIcons: Record<LinkIcon, IconType> = {
    gitlab: SiGitlab,
    github: SiGithub,
    docker: SiDocker,
    relay: FiServer,
    external: FiExternalLink,
    download: FiDownload,
    tag: FiTag,
};
