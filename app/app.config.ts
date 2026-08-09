export default defineAppConfig({
    title: 'Streamify',
    description: 'Next-generation platform for streaming and live events',

    theme: {
        dark: true,
    },
    streaming: {
        defaultQuality: 'auto',
        autoplay: true,
        mutedAutoplay: true,
        lowLatency: true,
        showChat: true,
        showViewerCount: true,
        showLiveBadge: true,
        reconnectAttempts: 5,
    },

    liveEvents: {
        enabled: true,
        allowReactions: true,
        allowChat: true,
        allowModeration: true,
        showSchedule: true,
    },

    player: {
        controls: true,
        pictureInPicture: true,
        fullscreen: true,
        theaterMode: true,
        keyboardShortcuts: true,
    },

    features: {
        liveStreaming: true,
        videoOnDemand: true,
        liveChat: true,
        reactions: true,
        subscriptions: true,
        notifications: true,
        creatorDashboard: true,
        analytics: true,
    },
    branding: {
        name: 'Streamify',
        tagline: 'Stream. Connect. Experience.',
    },
})