import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import "./App.css";

const reels = [
  {
    id: 1,
    username: "sachin.patel",
    avatar: "https://i.pravatar.cc/150?img=12",
    video: "/videos/test.mp4",
    caption:
      "Beautiful evening ✨ #travel #nature #reels",
    likes: 1248,
    comments: 82,
  },

  {
    id: 2,
    username: "travel.vibes",
    avatar: "https://i.pravatar.cc/150?img=32",
    video: "/videos/test2.mp4",
    caption:
      "Somewhere between the mountains and the sky 🏔️",
    likes: 8432,
    comments: 214,
  },

  {
    id: 3,
    username: "daily.visuals",
    avatar: "https://i.pravatar.cc/150?img=45",
    video: "/videos/test.mp4",
    caption:
      "Just enjoy the moment 🌊",
    likes: 21984,
    comments: 431,
  },

  {
    id: 4,
    username: "nature.daily",
    avatar: "https://i.pravatar.cc/150?img=49",
    video: "/videos/test2.mp4",
    caption:
      "Lost in nature 🌲✨",
    likes: 6432,
    comments: 128,
  },
];

/*
 * Repeat the reels several times.
 *
 * This gives us:
 *
 * 1 2 3 4
 * 1 2 3 4
 * 1 2 3 4
 *
 * When the user reaches an edge,
 * we silently move them back to
 * the middle copy.
 */
const REPEAT_COUNT = 5;

const infiniteReels = Array.from(
  { length: REPEAT_COUNT },
  () => reels
).flat();

const MIDDLE_COPY =
  Math.floor(REPEAT_COUNT / 2);

const INITIAL_INDEX =
  MIDDLE_COPY * reels.length;

function App() {
  const [activeIndex, setActiveIndex] =
    useState(INITIAL_INDEX);

  const [muted, setMuted] =
    useState(true);

  const [paused, setPaused] =
    useState(false);

  const [liked, setLiked] =
    useState({});

  const [showHeart, setShowHeart] =
    useState(false);

  const [progress, setProgress] =
    useState(0);

  const containerRef =
    useRef(null);

  const videoRefs =
    useRef([]);

  const clickTimerRef =
    useRef(null);

  const heartTimerRef =
    useRef(null);

  const resetTimerRef =
    useRef(null);

  /*
   * =========================================================
   * GET REAL REEL INDEX
   * =========================================================
   */

  const getRealIndex = useCallback(
    (index) => {
      return (
        ((index % reels.length) +
          reels.length) %
        reels.length
      );
    },
    []
  );

  /*
   * =========================================================
   * STOP ALL VIDEOS
   * =========================================================
   */

  const stopAllVideos = useCallback(() => {
    videoRefs.current.forEach(
      (video) => {
        if (!video) return;

        video.pause();

        /*
         * VERY IMPORTANT
         *
         * Previous Reel audio
         * can never continue.
         */
        video.muted = true;
      }
    );
  }, []);

  /*
   * =========================================================
   * PLAY ONE VIDEO
   * =========================================================
   */

  const playVideo = useCallback(
    (index) => {
      const video =
        videoRefs.current[index];

      if (!video) return;

      /*
       * Stop every other video.
       */
      videoRefs.current.forEach(
        (otherVideo, otherIndex) => {
          if (!otherVideo) return;

          if (otherIndex !== index) {
            otherVideo.pause();
            otherVideo.muted = true;
          }
        }
      );

      video.muted = muted;

      video.play().catch(() => {});

      setPaused(false);
    },
    [muted]
  );

  /*
   * =========================================================
   * ACTIVATE REEL
   * =========================================================
   */

  const activateReel = useCallback(
    (index, resetTime = true) => {
      if (
        index < 0 ||
        index >= infiniteReels.length
      ) {
        return;
      }

      stopAllVideos();

      setActiveIndex(index);

      setProgress(0);

      setPaused(false);

      const video =
        videoRefs.current[index];

      if (!video) return;

      if (resetTime) {
        try {
          video.currentTime = 0;
        } catch {}
      }

      video.muted = muted;

      video.play().catch(() => {});
    },
    [muted, stopAllVideos]
  );

  /*
   * =========================================================
   * INITIAL POSITION
   * =========================================================
   */

  useEffect(() => {
    const container =
      containerRef.current;

    if (!container) return;

    const moveToMiddle = () => {
      const height =
        container.clientHeight;

      if (!height) return;

      const index = INITIAL_INDEX;

      container.scrollTop =
        index * height;

      setActiveIndex(index);

      /*
       * Wait until video element exists.
       */
      setTimeout(() => {
        const video =
          videoRefs.current[index];

        if (!video) return;

        stopAllVideos();

        video.currentTime = 0;

        video.muted = muted;

        video.play().catch(() => {});
      }, 250);
    };

    moveToMiddle();
  }, [muted, stopAllVideos]);

  /*
   * =========================================================
   * INTERSECTION OBSERVER
   * =========================================================
   */

  useEffect(() => {
    const container =
      containerRef.current;

    if (!container) return;

    const sections =
      container.querySelectorAll(
        ".reel"
      );

    const observer =
      new IntersectionObserver(
        (entries) => {
          let bestEntry = null;

          entries.forEach(
            (entry) => {
              if (
                !entry.isIntersecting
              ) {
                return;
              }

              if (
                !bestEntry ||
                entry.intersectionRatio >
                  bestEntry.intersectionRatio
              ) {
                bestEntry = entry;
              }
            }
          );

          if (!bestEntry) return;

          if (
            bestEntry.intersectionRatio <
            0.65
          ) {
            return;
          }

          const index =
            Number(
              bestEntry.target.dataset
                .index
            );

          if (index === activeIndex) {
            return;
          }

          activateReel(index);
        },
        {
          root: container,

          threshold: [
            0.55,
            0.65,
            0.75,
            0.85,
            0.95,
            1,
          ],
        }
      );

    sections.forEach(
      (section) => {
        observer.observe(section);
      }
    );

    return () => {
      observer.disconnect();
    };
  }, [
    activeIndex,
    activateReel,
  ]);

  /*
   * =========================================================
   * INFINITE SCROLL
   * =========================================================
   */

  useEffect(() => {
    const container =
      containerRef.current;

    if (!container) return;

    let ticking = false;

    const handleScroll = () => {
      if (ticking) return;

      ticking = true;

      requestAnimationFrame(() => {
        const height =
          container.clientHeight;

        if (!height) {
          ticking = false;
          return;
        }

        const index =
          Math.round(
            container.scrollTop /
              height
          );

        /*
         * If user gets close to the
         * beginning, move to middle.
         */
        if (
          index <
          reels.length
        ) {
          const newIndex =
            index +
            reels.length *
              MIDDLE_COPY;

          resetInfinitePosition(
            newIndex
          );
        }

        /*
         * If user gets close to the
         * end, move to middle.
         */
        else if (
          index >=
          infiniteReels.length -
            reels.length
        ) {
          const newIndex =
            index -
            reels.length *
              MIDDLE_COPY;

          resetInfinitePosition(
            newIndex
          );
        }

        ticking = false;
      });
    };

    const resetInfinitePosition =
      (newIndex) => {
        clearTimeout(
          resetTimerRef.current
        );

        /*
         * Important:
         * Do NOT animate this movement.
         *
         * It should look like
         * infinite scrolling.
         */
        container.scrollTo({
          top:
            newIndex *
            container.clientHeight,

          behavior: "auto",
        });

        setActiveIndex(
          newIndex
        );

        setTimeout(() => {
          const video =
            videoRefs.current[
              newIndex
            ];

          if (!video) return;

          stopAllVideos();

          video.currentTime = 0;

          video.muted = muted;

          video.play().catch(
            () => {}
          );
        }, 20);
      };

    container.addEventListener(
      "scroll",
      handleScroll,
      {
        passive: true,
      }
    );

    return () => {
      container.removeEventListener(
        "scroll",
        handleScroll
      );

      clearTimeout(
        resetTimerRef.current
      );
    };
  }, [muted, stopAllVideos]);

  /*
   * =========================================================
   * MUTE STATE
   * =========================================================
   */

  useEffect(() => {
    videoRefs.current.forEach(
      (video, index) => {
        if (!video) return;

        if (
          index === activeIndex
        ) {
          video.muted = muted;
        } else {
          video.muted = true;
        }
      }
    );
  }, [
    muted,
    activeIndex,
  ]);

  /*
   * =========================================================
   * TOGGLE PLAY
   * =========================================================
   */

  const togglePlay = () => {
    const video =
      videoRefs.current[
        activeIndex
      ];

    if (!video) return;

    if (video.paused) {
      playVideo(activeIndex);
    } else {
      video.pause();

      setPaused(true);
    }
  };

  /*
   * =========================================================
   * LIKE
   * =========================================================
   */

  const handleLike = (
    id
  ) => {
    setLiked(
      (previous) => ({
        ...previous,

        [id]:
          !previous[id],
      })
    );
  };

  /*
   * =========================================================
   * DOUBLE TAP
   * =========================================================
   */

  const handleDoubleTap = (
    id
  ) => {
    if (!liked[id]) {
      handleLike(id);
    }

    setShowHeart(true);

    clearTimeout(
      heartTimerRef.current
    );

    heartTimerRef.current =
      setTimeout(() => {
        setShowHeart(false);
      }, 800);
  };

  /*
   * =========================================================
   * VIDEO CLICK
   * =========================================================
   */

  const handleVideoClick = (
    id
  ) => {
    if (
      clickTimerRef.current
    ) {
      clearTimeout(
        clickTimerRef.current
      );

      clickTimerRef.current =
        null;

      handleDoubleTap(id);

      return;
    }

    clickTimerRef.current =
      setTimeout(() => {
        togglePlay();

        clickTimerRef.current =
          null;
      }, 220);
  };

  /*
   * =========================================================
   * VIDEO END
   * =========================================================
   */

  const handleVideoEnded = (
    index
  ) => {
    if (
      index !== activeIndex
    ) {
      return;
    }

    const video =
      videoRefs.current[index];

    if (!video) return;

    video.pause();

    /*
     * Do not loop the individual
     * video.
     */
    setPaused(true);

    /*
     * Automatically go to next Reel.
     *
     * This gives Instagram-like
     * continuous playback.
     */
    const nextIndex =
      index + 1;

    if (
      nextIndex <
      infiniteReels.length
    ) {
      const container =
        containerRef.current;

      if (!container) return;

      container.scrollTo({
        top:
          nextIndex *
          container.clientHeight,

        behavior: "smooth",
      });
    }
  };

  /*
   * =========================================================
   * SHARE
   * =========================================================
   */

  const shareReel = async (
    reel
  ) => {
    try {
      if (
        navigator.share
      ) {
        await navigator.share({
          title:
            `${reel.username} Reel`,

          text:
            reel.caption,

          url:
            window.location.href,
        });
      } else {
        await navigator.clipboard.writeText(
          window.location.href
        );

        alert(
          "Reel link copied!"
        );
      }
    } catch {
      // Cancelled
    }
  };

  /*
   * =========================================================
   * CLEANUP
   * =========================================================
   */

  useEffect(() => {
    return () => {
      videoRefs.current.forEach(
        (video) => {
          if (!video) return;

          video.pause();

          video.muted = true;
        }
      );

      clearTimeout(
        clickTimerRef.current
      );

      clearTimeout(
        heartTimerRef.current
      );
    };
  }, []);

  /*
   * =========================================================
   * UI
   * =========================================================
   */

  return (
    <div className="app">

      {/* Ambient background */}

      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />
      <div className="ambient ambient-three" />

      {/* Main Reels */}

      <main
        className="reels-container"
        ref={containerRef}
      >
        {infiniteReels.map(
          (reel, index) => {
            const realIndex =
              getRealIndex(index);

            const isLiked =
              !!liked[reel.id];

            const isActive =
              index ===
              activeIndex;

            return (
              <section
                className="reel"
                data-index={index}
                key={`${reel.id}-${index}`}
              >

                {/* Video */}

                <video
                  ref={(element) => {
                    videoRefs.current[
                      index
                    ] = element;
                  }}
                  className="reel-video"
                  src={reel.video}
                  playsInline
                  loop={false}
                  muted={
                    !isActive ||
                    muted
                  }
                  preload={
                    Math.abs(
                      index -
                        activeIndex
                    ) <= 1
                      ? "auto"
                      : "metadata"
                  }
                  onClick={() =>
                    handleVideoClick(
                      reel.id
                    )
                  }
                  onEnded={() =>
                    handleVideoEnded(
                      index
                    )
                  }
                  onTimeUpdate={(
                    event
                  ) => {
                    if (!isActive)
                      return;

                    const video =
                      event.currentTarget;

                    if (
                      !video.duration ||
                      !Number.isFinite(
                        video.duration
                      )
                    ) {
                      return;
                    }

                    setProgress(
                      Math.min(
                        100,
                        (video.currentTime /
                          video.duration) *
                          100
                      )
                    );
                  }}
                  onPlay={() => {
                    /*
                     * Final safety:
                     * whenever one video plays,
                     * kill all other videos.
                     */
                    videoRefs.current.forEach(
                      (
                        other,
                        otherIndex
                      ) => {
                        if (
                          !other ||
                          otherIndex ===
                            index
                        ) {
                          return;
                        }

                        other.pause();

                        other.muted =
                          true;
                      }
                    );

                    if (isActive) {
                      setPaused(
                        false
                      );
                    }
                  }}
                  onPause={() => {
                    if (
                      isActive
                    ) {
                      setPaused(
                        true
                      );
                    }
                  }}
                />

                {/* Glass overlay */}

                <div className="video-glass" />

                {/* Top glass bar */}

                <div className="top-glass">

                  <div className="top-title">
                    <span className="reels-logo">
                      ✦
                    </span>

                    <span>
                      Reels
                    </span>
                  </div>

                  <button
                    className="glass-sound"
                    onClick={() =>
                      setMuted(
                        (value) =>
                          !value
                      )
                    }
                  >
                    {muted
                      ? "🔇"
                      : "🔊"}
                  </button>

                </div>

                {/* Pause */}

                {paused &&
                  isActive && (
                    <div className="pause-indicator">
                      ▶
                    </div>
                  )}

                {/* Heart */}

                {showHeart &&
                  isActive && (
                    <div className="big-heart">
                      ♥
                    </div>
                  )}

                {/* Right Glass Actions */}

                <aside className="reel-actions">

                  {/* Profile */}

                  <div className="profile-glass">

                    <img
                      src={
                        reel.avatar
                      }
                      alt=""
                    />

                    <span>
                      +
                    </span>

                  </div>

                  {/* Like */}

                  <button
                    className={`glass-action ${
                      isLiked
                        ? "liked"
                        : ""
                    }`}
                    onClick={() =>
                      handleLike(
                        reel.id
                      )
                    }
                  >

                    <strong>
                      {isLiked
                        ? "♥"
                        : "♡"}
                    </strong>

                    <small>
                      {(
                        reel.likes +
                        (isLiked
                          ? 1
                          : 0)
                      ).toLocaleString()}
                    </small>

                  </button>

                  {/* Comment */}

                  <button className="glass-action">

                    <strong>
                      💬
                    </strong>

                    <small>
                      {
                        reel.comments
                      }
                    </small>

                  </button>

                  {/* Share */}

                  <button
                    className="glass-action"
                    onClick={() =>
                      shareReel(
                        reel
                      )
                    }
                  >

                    <strong>
                      ↗
                    </strong>

                    <small>
                      Share
                    </small>

                  </button>

                  {/* More */}

                  <button className="glass-action">

                    <strong>
                      ⋯
                    </strong>

                  </button>

                </aside>

                {/* Bottom Glass Information */}

                <div className="bottom-content">

                  <div className="user-glass">

                    <img
                      src={
                        reel.avatar
                      }
                      alt=""
                    />

                    <strong>
                      {
                        reel.username
                      }
                    </strong>

                    <button>
                      Follow
                    </button>

                  </div>

                  <p>
                    {
                      reel.caption
                    }
                  </p>

                  <div className="audio-glass">

                    <span>
                      ♫
                    </span>

                    <div>
                      Original audio ·{" "}
                      {
                        reel.username
                      }
                    </div>

                  </div>

                </div>

                {/* Music Disc */}

                <div
                  className={`music-disc ${
                    paused
                      ? "disc-paused"
                      : ""
                  }`}
                >
                  <img
                    src={
                      reel.avatar
                    }
                    alt=""
                  />
                </div>

                {/* Progress */}

                <div className="progress">

                  <span
                    style={{
                      width:
                        isActive
                          ? `${progress}%`
                          : "0%",
                    }}
                  />

                </div>

                {/* Copy indicator */}

                <div className="copy-indicator">
                  {realIndex + 1}
                </div>

              </section>
            );
          }
        )}
      </main>

    </div>
  );
}

export default App;