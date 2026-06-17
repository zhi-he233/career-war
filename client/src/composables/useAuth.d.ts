export interface PublicUser {
    id: string;
    username: string;
    nickname: string;
    displayName: string;
    avatar: string;
    tutorialCompleted: boolean;
    createdAt: string;
}
interface AuthResult {
    ok: true;
    data: PublicUser;
}
interface AuthError {
    ok: false;
    error: string;
}
type AuthResponse = AuthResult | AuthError;
declare function fetchMe(): Promise<void>;
declare function register(username: string, password: string): Promise<AuthResponse>;
declare function login(username: string, password: string): Promise<AuthResponse>;
declare function logout(): Promise<void>;
declare function updateProfile(patch: Partial<Pick<PublicUser, "avatar">> & {
    tutorialCompleted?: boolean;
}): Promise<AuthResponse>;
export declare function useAuth(): {
    currentUser: import("vue").Ref<{
        id: string;
        username: string;
        nickname: string;
        displayName: string;
        avatar: string;
        tutorialCompleted: boolean;
        createdAt: string;
    } | null, PublicUser | {
        id: string;
        username: string;
        nickname: string;
        displayName: string;
        avatar: string;
        tutorialCompleted: boolean;
        createdAt: string;
    } | null>;
    isLoggedIn: import("vue").ComputedRef<boolean>;
    loading: import("vue").Ref<boolean, boolean>;
    fetchMe: typeof fetchMe;
    register: typeof register;
    login: typeof login;
    logout: typeof logout;
    updateProfile: typeof updateProfile;
};
export {};
