import { useEffect, useRef } from "react";

interface StarObject {
  element: HTMLDivElement;
  baseX: number;
  baseY: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  repelX: number;
  repelY: number;
}

export default function StarfieldBackground() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const starCount = 150;
    const stars: StarObject[] = [];
    const repelRadius = 150;
    const mouse = { x: -1000, y: -1000 };
    let animationFrameId: number;

    function initStars() {
      if (!container) return;
      container.innerHTML = "";
      stars.length = 0;
      const width = window.innerWidth;
      const height = window.innerHeight;

      for (let i = 0; i < starCount; i++) {
        const star = document.createElement("div");
        
        // Inline styles to replicate your original CSS rules dynamically
        star.style.position = "absolute";
        star.style.background = "white";
        star.style.borderRadius = "50%";
        star.style.pointerEvents = "none";

        const size = Math.random() * 2 + 1;
        const initialX = Math.random() * width;
        const initialY = Math.random() * height;

        star.style.width = `${size}px`;
        star.style.height = `${size}px`;
        star.style.opacity = (Math.random() * 0.7 + 0.3).toString();

        const starObj: StarObject = {
          element: star,
          baseX: initialX,
          baseY: initialY,
          x: initialX,
          y: initialY,
          vx: (Math.random() - 0.5) * 0.2,
          vy: (Math.random() - 0.5) * 0.2,
          repelX: 0,
          repelY: 0,
        };

        star.style.left = `${starObj.x}px`;
        star.style.top = `${starObj.y}px`;
        container.appendChild(star);
        stars.push(starObj);
      }
    }

    function updateStars() {
      const width = window.innerWidth;
      const height = window.innerHeight;

      stars.forEach((star) => {
        star.baseX += star.vx;
        star.baseY += star.vy;

        if (star.baseX < 0) star.baseX = width;
        if (star.baseX > width) star.baseX = 0;
        if (star.baseY < 0) star.baseY = height;
        if (star.baseY > height) star.baseY = 0;

        const dx = mouse.x - star.baseX;
        const dy = mouse.y - star.baseY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        let targetRepelX = 0;
        let targetRepelY = 0;

        if (distance < repelRadius) {
          const force = (repelRadius - distance) / repelRadius;
          const angle = Math.atan2(dy, dx);
          targetRepelX = -Math.cos(angle) * force * 60;
          targetRepelY = -Math.sin(angle) * force * 60;
        }

        star.repelX += (targetRepelX - star.repelX) * 0.1;
        star.repelY += (targetRepelY - star.repelY) * 0.1;

        star.x = star.baseX + star.repelX;
        star.y = star.baseY + star.repelY;

        star.element.style.left = `${star.x}px`;
        star.element.style.top = `${star.y}px`;
      });

      animationFrameId = requestAnimationFrame(updateStars);
    }

    const handleMouseMove = (e: MouseEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    };

    const handleResize = () => {
      initStars();
    };

    // Attach events and initialize loop
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("resize", handleResize);
    initStars();
    updateStars();

    // Clean up event listeners and loop if the component unmounts
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        zIndex: -1,
        backgroundColor: "#000",
        overflow: "hidden",
      }}
    />
  );
}