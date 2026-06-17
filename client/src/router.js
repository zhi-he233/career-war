import { createRouter, createWebHistory } from "vue-router";
/**
 * Minimal router — only manages URL structure.
 * All page rendering and state management stays in App.vue via route-aware template.
 * Route params are consumed by App.vue through useRoute().
 */
/** Placeholder component — App.vue's template handles all actual rendering. */
const PassThrough = { template: "<div />" };
const router = createRouter({
    history: createWebHistory(),
    routes: [
        { path: "/", name: "home", component: PassThrough },
        { path: "/modes", name: "modes", component: PassThrough },
        { path: "/room/:roomId", name: "lobby", component: PassThrough },
        { path: "/room/:roomId/battle", name: "battle", component: PassThrough }
    ]
});
export default router;
