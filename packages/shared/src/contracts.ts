export const apiContracts = {
  auth: {
    register: {
      method: "POST",
      path: "/v1/auth/register"
    },
    login: {
      method: "POST",
      path: "/v1/auth/login"
    },
    me: {
      method: "GET",
      path: "/v1/me"
    }
  },
  profiles: {
    getPublic: {
      method: "GET",
      path: "/v1/profiles/:id"
    },
    updateMe: {
      method: "PATCH",
      path: "/v1/profile"
    }
  },
  swings: {
    requestUpload: {
      method: "POST",
      path: "/v1/swings/uploads"
    },
    create: {
      method: "POST",
      path: "/v1/swings"
    },
    list: {
      method: "GET",
      path: "/v1/swings"
    },
    listShared: {
      method: "GET",
      path: "/v1/swings/shared"
    },
    getById: {
      method: "GET",
      path: "/v1/swings/:id"
    },
    upsertFrameTags: {
      method: "PUT",
      path: "/v1/swings/:id/frame-tags"
    },
    listFrameTags: {
      method: "GET",
      path: "/v1/swings/:id/frame-tags"
    },
    requestAnalysis: {
      method: "POST",
      path: "/v1/swings/:id/analysis"
    },
    listAnalyses: {
      method: "GET",
      path: "/v1/swings/:id/analysis"
    }
  },
  goals: {
    create: {
      method: "POST",
      path: "/v1/goals"
    },
    list: {
      method: "GET",
      path: "/v1/goals"
    },
    update: {
      method: "PATCH",
      path: "/v1/goals/:id"
    }
  },
  progress: {
    createSnapshot: {
      method: "POST",
      path: "/v1/progress"
    },
    listSnapshots: {
      method: "GET",
      path: "/v1/progress"
    }
  },
  journey: {
    updateMemory: {
      method: "PUT",
      path: "/v1/journey"
    }
  }
} as const;
