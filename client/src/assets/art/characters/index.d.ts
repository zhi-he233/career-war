export interface CharacterArt {
    sprite?: string;
    avatar?: string;
}
export declare function getCharacterArt(characterId: string | undefined): CharacterArt | undefined;
