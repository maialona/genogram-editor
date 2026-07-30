import { forwardRef, useImperativeHandle, useRef } from "react";
import { gsap } from "gsap";
import { DrawSVGPlugin } from "gsap/DrawSVGPlugin";
import "./PageTransition.css";

gsap.registerPlugin(DrawSVGPlugin);

export interface PageTransitionHandle {
  /** Plays the cover→reveal draw animation, calling `onCovered` at the moment
   *  the screen is fully covered — swap the underlying view there. */
  play: (onCovered: () => void) => Promise<void>;
}

export const PageTransition = forwardRef<PageTransitionHandle>(
  function PageTransition(_props, ref) {
    const pathRef = useRef<SVGPathElement>(null);

    useImperativeHandle(ref, () => ({
      play(onCovered) {
        return new Promise((resolve) => {
          const path = pathRef.current;
          if (!path) {
            onCovered();
            resolve();
            return;
          }

          const reducedMotion = window.matchMedia(
            "(prefers-reduced-motion: reduce)"
          ).matches;

          if (reducedMotion) {
            onCovered();
            resolve();
            return;
          }

          const tl = gsap.timeline({ onComplete: () => resolve() });

          tl.set(path, { strokeWidth: "5%", drawSVG: "0% 0%" });

          // Leave: draw the path forward, thickening to cover the screen.
          tl.to(path, {
            duration: 1,
            drawSVG: "0% 85%",
            ease: "power1.inOut",
          });

          tl.to(
            path,
            {
              strokeWidth: "30%",
              duration: 0.75,
              ease: "power1.inOut",
            },
            "<0.25"
          );

          tl.call(onCovered);

          // Enter: continue drawing forward while thinning back down,
          // revealing the new view underneath.
          tl.to(path, {
            duration: 1.25,
            drawSVG: "100% 100%",
            strokeWidth: "5%",
            ease: "power1.inOut",
          });
        });
      },
    }));

    return (
      <div className="page-transition" aria-hidden="true">
        <div className="page-transition__shape">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="100%"
            viewBox="0 0 1000 1000"
            fill="none"
            preserveAspectRatio="none"
            className="page-transition__svg"
          >
            <path
              ref={pathRef}
              d="M43 259C296 11.5688 994 -3 922.994 498.259C851.988 999.517 281.229 1004.28 123 767C-35.2287 529.721 179 259 472 259C765 259 792 498.259 659 654C526 809.741 319 755 285 669.001C251 583.001 299 452 496 452C693 452 876.073 639.171 935 937.001"
              stroke="currentColor"
              strokeWidth="0"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>
    );
  }
);
