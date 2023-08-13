"use client"
import React, { useState, useEffect } from 'react';
import { useSpring, animated } from '@react-spring/web';
import { useLocalStorage } from "usehooks-ts";
export default function LogoComponent() {
    let colors = ['#111', '#222', '#333', '#444', '#555'];
    const [currentColorIndex, setCurrentColorIndex] = useState(0);
    const [theme, setTheme] = useLocalStorage("theme", "dark");
    if (theme == 'dark') {
        colors = ['#888', '#999', '#aaa', '#bbb', '#ccc']
    }
    const paths = [
        'M 37.334763 48.052872 L 127.456238 138.085022 L 169.97142 95.569839 L 213.469101 139.067535 L 225.973557 126.384422 L 170.953918 71.454086 L 131.386215 111.379059 L 52.876026 32.690247 L 73.954987 11.343338 C 73.954987 11.343338 31.798319 26.824554 10.896749 74.490891 Z',
        'M 68.685249 32.868881 L 131.028946 95.48053 L 170.953918 55.287598 L 242.05072 126.384422 L 213.290451 155.234009 L 169.882111 111.736328 L 127.36692 154.251526 L 37.42408 64.130051 L 2.858164 98.695969 C 2.858164 98.695969 -1.277932 114.372971 0.446588 132.993927 L 88.424438 221.150406 L 99.589142 209.896393 L 6.877457 117.184708 L 36.709538 87.263306 L 129.689178 179.885681 L 172.56163 136.834595 L 202.125748 166.398712 L 118.435158 249.196136 C 118.435158 249.196136 123.383041 251.353882 143.265457 248.392288 L 248.660233 143.354767 C 248.660233 143.354767 251.266769 128.857376 249.106812 109.592712 L 170.775284 31.350479 L 130.225082 71.811356 L 91.371918 32.868881 C 91.371918 32.868881 123.615578 0.26796 123.615578 0.26796 C 123.615578 0.26796 113.386108 -0.645996 98.428009 2.947479 Z',
        'M 107.449089 32.868881 L 130.046448 55.912827 L 170.596649 15.362625 L 244.55162 89.228302 C 244.55162 89.228302 227.670471 14.854477 139.156845 0.089325 Z',
        'M 185.959274 166.398712 L 172.56163 152.911743 L 129.689178 196.052155 L 36.709538 103.519119 L 23.311897 117.274033 L 115.487671 210.342987 L 88.513756 237.13826 L 3.304752 152.107895 C 3.304752 152.107895 14.322843 230.321304 107.806358 249.910675 Z',
        'M 165.14827 242.943909 C 165.14827 242.943909 221.453522 228.346115 243.033234 165.14827 Z',
        // Duplicate the first path to create a seamless loop
        'M 37.334763 48.052872 L 127.456238 138.085022 L 169.97142 95.569839 L 213.469101 139.067535 L 225.973557 126.384422 L 170.953918 71.454086 L 131.386215 111.379059 L 52.876026 32.690247 L 73.954987 11.343338 C 73.954987 11.343338 31.798319 26.824554 10.896749 74.490891 Z',
    ];

    /*
    const pathAnimation = useSpring({
        from: { strokeDashoffset: 700, strokeDasharray: 500 },
        to: { strokeDashoffset: 0, strokeDasharray: 500 },
        config: { duration: 6000 },
        loop: true, // Use loop object with reverse property for seamless loop
    });
    */
    const pathAnimation = useSpring({
        from: { strokeDashoffset: 1000, strokeDasharray: 500 },
        to: { strokeDashoffset: 0, strokeDasharray: 500 },
        config: { duration: 5000 },
        loop: true, // Use loop object with reverse property for seamless loop
    });

    /*
    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentColorIndex((prevIndex) => (prevIndex + 1) % colors.length);
        }, 1000);

        return () => clearInterval(timer);
    }, []);
    */

    return (
        <svg width="100%" viewBox="0 0 250 250" xmlns="http://www.w3.org/2000/svg">
            {paths.map((path, index) => (
                <animated.path
                    key={`path-${index + 1}`}
                    id={`Path-${index + 1}`}
                    fill="none"
                    stroke={colors[(currentColorIndex + index) % colors.length]}
                    strokeWidth="2"
                    d={path}
                    style={pathAnimation}
                />
            ))}
        </svg>
    );
};
