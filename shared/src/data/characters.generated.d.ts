export declare const GENERATED_CHARACTERS: readonly [{
    readonly id: "boxer";
    readonly name: "拳手";
    readonly title: "attack";
    readonly description: "没有额外规则，按骰点造成伤害。";
    readonly maxHp: 20;
    readonly avatarUrl: "";
    readonly spriteUrl: "";
    readonly tags: ["新手推荐", "攻击", "稳定"];
    readonly difficulty: "simple";
    readonly sortOrder: 1;
    readonly availability: {
        readonly classic: true;
        readonly duo: true;
        readonly pve: true;
        readonly roguelite: true;
        readonly hidden: false;
    };
    readonly implementation: {
        readonly mode: "code_driven";
        readonly handlerId: "boxer";
    };
    readonly diceFaces: [{
        readonly roll: 1;
        readonly name: "1 点";
        readonly description: "造成 1 点伤害。";
    }, {
        readonly roll: 2;
        readonly name: "2 点";
        readonly description: "造成 2 点伤害。";
    }, {
        readonly roll: 3;
        readonly name: "3 点";
        readonly description: "造成 3 点伤害。";
    }, {
        readonly roll: 4;
        readonly name: "4 点";
        readonly description: "造成 4 点伤害。";
    }, {
        readonly roll: 5;
        readonly name: "5 点";
        readonly description: "造成 5 点伤害。";
    }, {
        readonly roll: 6;
        readonly name: "6 点";
        readonly description: "造成 6 点伤害。";
    }];
    readonly role: "attack";
    readonly shortDescription: "没有额外规则，按骰点造成伤害。";
    readonly fullDescription: ["无技能", "投到几点造成几点伤害"];
    readonly isImplemented: true;
}, {
    readonly id: "gunslinger";
    readonly name: "枪手";
    readonly title: "burst";
    readonly description: "低保伤害偏低，但 6 点能打出高额爆发。";
    readonly maxHp: 18;
    readonly avatarUrl: "";
    readonly spriteUrl: "";
    readonly tags: ["攻击", "爆发", "连投"];
    readonly difficulty: "complex";
    readonly sortOrder: 2;
    readonly availability: {
        readonly classic: true;
        readonly duo: true;
        readonly pve: true;
        readonly roguelite: true;
        readonly hidden: false;
    };
    readonly implementation: {
        readonly mode: "code_driven";
        readonly handlerId: "gunslinger";
    };
    readonly diceFaces: [{
        readonly roll: 1;
        readonly name: "复制伤害";
        readonly description: "可复制上一名玩家的最终伤害；普通攻击造成 0 点伤害。";
    }, {
        readonly roll: 2;
        readonly name: "低火力射击";
        readonly description: "造成 1 点伤害。";
    }, {
        readonly roll: 3;
        readonly name: "射击";
        readonly description: "造成 2 点伤害。";
    }, {
        readonly roll: 4;
        readonly name: "射击";
        readonly description: "造成 3 点伤害。";
    }, {
        readonly roll: 5;
        readonly name: "射击";
        readonly description: "造成 4 点伤害。";
    }, {
        readonly roll: 6;
        readonly name: "连射";
        readonly description: "可再投一次，第二次骰点 x3 作为额外伤害；普通攻击造成 5 点伤害。";
    }];
    readonly role: "burst";
    readonly shortDescription: "低保伤害偏低，但 6 点能打出高额爆发。";
    readonly fullDescription: ["基础伤害 -1", "6 点再投一次，第二次骰点 x3", "1 点复制上一名玩家最终伤害"];
    readonly isImplemented: true;
}, {
    readonly id: "vampire";
    readonly name: "吸血鬼";
    readonly title: "healing";
    readonly description: "靠吸血和额外回复维持生存。";
    readonly maxHp: 15;
    readonly avatarUrl: "";
    readonly spriteUrl: "";
    readonly tags: ["治疗", "续航", "特殊"];
    readonly difficulty: "complex";
    readonly sortOrder: 3;
    readonly availability: {
        readonly classic: true;
        readonly duo: true;
        readonly pve: true;
        readonly roguelite: true;
        readonly hidden: false;
    };
    readonly implementation: {
        readonly mode: "code_driven";
        readonly handlerId: "vampire";
    };
    readonly diceFaces: [{
        readonly roll: 1;
        readonly name: "吸血";
        readonly description: "可造成 1 点伤害并回复 2 点生命。";
    }, {
        readonly roll: 2;
        readonly name: "爪击";
        readonly description: "造成 2 点伤害。";
    }, {
        readonly roll: 3;
        readonly name: "血雾";
        readonly description: "本次不造成伤害。";
    }, {
        readonly roll: 4;
        readonly name: "爪击";
        readonly description: "造成 4 点伤害。";
    }, {
        readonly roll: 5;
        readonly name: "爪击";
        readonly description: "造成 5 点伤害。";
    }, {
        readonly roll: 6;
        readonly name: "血祭回复";
        readonly description: "可再投一次，并按第二次骰点 x3 回复生命，溢出变护盾；普通攻击造成 6 点伤害。";
    }];
    readonly role: "healing";
    readonly shortDescription: "靠吸血和额外回复维持生存。";
    readonly fullDescription: ["3 点无伤", "1 点造成 1 伤害并回复 2 血", "6 点再投一次，回复骰点 x3，溢出变护盾"];
    readonly isImplemented: true;
}, {
    readonly id: "zhaoZilong";
    readonly name: "赵子龙";
    readonly title: "attack";
    readonly description: "攻击能无视护盾，连续造成血量伤害后会回复自己。";
    readonly maxHp: 20;
    readonly avatarUrl: "";
    readonly spriteUrl: "";
    readonly tags: ["新手推荐", "攻击", "破盾"];
    readonly difficulty: "normal";
    readonly sortOrder: 4;
    readonly availability: {
        readonly classic: true;
        readonly duo: true;
        readonly pve: true;
        readonly roguelite: true;
        readonly hidden: false;
    };
    readonly implementation: {
        readonly mode: "code_driven";
        readonly handlerId: "zhaoZilong";
    };
    readonly diceFaces: [{
        readonly roll: 1;
        readonly name: "破盾一击";
        readonly description: "造成 1 点伤害，并无视护盾。";
    }, {
        readonly roll: 2;
        readonly name: "破盾二连";
        readonly description: "造成 2 点伤害，并无视护盾。";
    }, {
        readonly roll: 3;
        readonly name: "破盾突刺";
        readonly description: "造成 3 点伤害，并无视护盾。";
    }, {
        readonly roll: 4;
        readonly name: "龙影闪避";
        readonly description: "本次不造成伤害。";
    }, {
        readonly roll: 5;
        readonly name: "破盾强袭";
        readonly description: "造成 5 点伤害，并无视护盾。";
    }, {
        readonly roll: 6;
        readonly name: "破盾猛攻";
        readonly description: "造成 6 点伤害，并无视护盾。";
    }];
    readonly role: "attack";
    readonly shortDescription: "攻击能无视护盾，连续造成血量伤害后会回复自己。";
    readonly fullDescription: ["4 点无伤：投出 4 时不造成伤害，自动跳过行动", "造成伤害时无视护盾", "龙胆：每成功造成 3 次血量伤害后，回复 2 点血，触发后计数清零。"];
    readonly isImplemented: true;
}, {
    readonly id: "assassin";
    readonly name: "刺客";
    readonly title: "burst";
    readonly description: "血量较低，但基础输出更凶。";
    readonly maxHp: 15;
    readonly avatarUrl: "";
    readonly spriteUrl: "";
    readonly tags: ["攻击", "爆发", "低血量"];
    readonly difficulty: "normal";
    readonly sortOrder: 5;
    readonly availability: {
        readonly classic: true;
        readonly duo: true;
        readonly pve: true;
        readonly roguelite: true;
        readonly hidden: false;
    };
    readonly implementation: {
        readonly mode: "code_driven";
        readonly handlerId: "assassin";
    };
    readonly diceFaces: [{
        readonly roll: 1;
        readonly name: "要害刺击";
        readonly description: "造成 3 点伤害。";
    }, {
        readonly roll: 2;
        readonly name: "刺击";
        readonly description: "造成 3 点伤害。";
    }, {
        readonly roll: 3;
        readonly name: "刺击";
        readonly description: "造成 4 点伤害。";
    }, {
        readonly roll: 4;
        readonly name: "刺击";
        readonly description: "造成 5 点伤害。";
    }, {
        readonly roll: 5;
        readonly name: "刺击";
        readonly description: "造成 6 点伤害。";
    }, {
        readonly roll: 6;
        readonly name: "刺击";
        readonly description: "造成 7 点伤害。";
    }];
    readonly role: "burst";
    readonly shortDescription: "血量较低，但基础输出更凶。";
    readonly fullDescription: ["基础伤害 +1", "1 点造成 3 点伤害"];
    readonly isImplemented: true;
}, {
    readonly id: "paladin";
    readonly name: "圣骑士";
    readonly title: "defense";
    readonly description: "能制造全员无敌窗口，并在发动时保护自己。";
    readonly maxHp: 20;
    readonly avatarUrl: "";
    readonly spriteUrl: "";
    readonly tags: ["防御", "特殊", "团队"];
    readonly difficulty: "complex";
    readonly sortOrder: 6;
    readonly availability: {
        readonly classic: true;
        readonly duo: true;
        readonly pve: true;
        readonly roguelite: true;
        readonly hidden: false;
    };
    readonly implementation: {
        readonly mode: "code_driven";
        readonly handlerId: "paladin";
    };
    readonly diceFaces: [{
        readonly roll: 1;
        readonly name: "守势";
        readonly description: "本次不造成伤害。";
    }, {
        readonly roll: 2;
        readonly name: "圣击";
        readonly description: "造成 2 点伤害。";
    }, {
        readonly roll: 3;
        readonly name: "圣击";
        readonly description: "造成 3 点伤害。";
    }, {
        readonly roll: 4;
        readonly name: "圣盾庇护";
        readonly description: "可使全员无敌到自己下次行动开始前，并获得 3 点护盾；普通攻击造成 4 点伤害。";
    }, {
        readonly roll: 5;
        readonly name: "圣击";
        readonly description: "造成 5 点伤害。";
    }, {
        readonly roll: 6;
        readonly name: "圣击";
        readonly description: "造成 6 点伤害。";
    }];
    readonly role: "defense";
    readonly shortDescription: "能制造全员无敌窗口，并在发动时保护自己。";
    readonly fullDescription: ["1 点无伤", "4 点全员无敌，持续到圣骑士下一次行动开始前", "发动 4 点技能时，圣骑士自己获得 3 点护盾。"];
    readonly isImplemented: true;
}, {
    readonly id: "berserker";
    readonly name: "狂战士";
    readonly title: "burst";
    readonly description: "高风险高回报，残血时爆发极高。";
    readonly maxHp: 10;
    readonly avatarUrl: "";
    readonly spriteUrl: "";
    readonly tags: ["爆发", "高手", "低血量"];
    readonly difficulty: "expert";
    readonly sortOrder: 7;
    readonly availability: {
        readonly classic: true;
        readonly duo: true;
        readonly pve: true;
        readonly roguelite: true;
        readonly hidden: false;
    };
    readonly implementation: {
        readonly mode: "code_driven";
        readonly handlerId: "berserker";
    };
    readonly diceFaces: [{
        readonly roll: 1;
        readonly name: "1 点狂击";
        readonly description: "造成 1 点基础伤害，并追加已损失生命值等量伤害。";
    }, {
        readonly roll: 2;
        readonly name: "2 点狂击";
        readonly description: "造成 2 点基础伤害，并追加已损失生命值等量伤害。";
    }, {
        readonly roll: 3;
        readonly name: "3 点狂击";
        readonly description: "造成 3 点基础伤害，并追加已损失生命值等量伤害。";
    }, {
        readonly roll: 4;
        readonly name: "4 点狂击";
        readonly description: "造成 4 点基础伤害，并追加已损失生命值等量伤害。";
    }, {
        readonly roll: 5;
        readonly name: "5 点狂击";
        readonly description: "造成 5 点基础伤害，并追加已损失生命值等量伤害。";
    }, {
        readonly roll: 6;
        readonly name: "6 点狂击";
        readonly description: "造成 6 点基础伤害，并追加已损失生命值等量伤害。";
    }];
    readonly role: "burst";
    readonly shortDescription: "高风险高回报，残血时爆发极高。";
    readonly fullDescription: ["血量很低，但越残血伤害越高", "损失了多少血，本次攻击就额外增加多少伤害"];
    readonly isImplemented: true;
}, {
    readonly id: "stone_titan";
    readonly name: "巨石泰坦";
    readonly title: "defense";
    readonly description: "血量极高，但低点数经常打不出伤害。";
    readonly maxHp: 30;
    readonly avatarUrl: "";
    readonly spriteUrl: "";
    readonly tags: ["防御", "重装", "高血量", "低频爆发"];
    readonly difficulty: "simple";
    readonly sortOrder: 8;
    readonly availability: {
        readonly classic: true;
        readonly duo: true;
        readonly pve: true;
        readonly roguelite: true;
        readonly hidden: false;
    };
    readonly implementation: {
        readonly mode: "code_driven";
        readonly handlerId: "stone_titan";
    };
    readonly diceFaces: [{
        readonly roll: 1;
        readonly name: "沉重迟缓";
        readonly description: "本次不造成伤害。";
    }, {
        readonly roll: 2;
        readonly name: "沉重迟缓";
        readonly description: "本次不造成伤害。";
    }, {
        readonly roll: 3;
        readonly name: "沉重迟缓";
        readonly description: "本次不造成伤害。";
    }, {
        readonly roll: 4;
        readonly name: "沉重迟缓";
        readonly description: "本次不造成伤害。";
    }, {
        readonly roll: 5;
        readonly name: "巨岩重击";
        readonly description: "造成 5 点伤害。";
    }, {
        readonly roll: 6;
        readonly name: "碾压";
        readonly description: "可造成 9 点伤害；普通攻击造成 6 点伤害。";
    }];
    readonly role: "defense";
    readonly shortDescription: "血量极高，但低点数经常打不出伤害。";
    readonly fullDescription: ["巨石泰坦拥有 30 点血量。", "投到 1、2、3、4 时不会造成伤害。", "投到 5 时造成 5 点伤害；投到 6 时造成 9 点伤害。"];
    readonly isImplemented: true;
}, {
    readonly id: "fearless_assassin";
    readonly name: "刺客（无畏）";
    readonly title: "burst";
    readonly description: "血量越健康，攻击越凶。";
    readonly maxHp: 15;
    readonly avatarUrl: "";
    readonly spriteUrl: "";
    readonly tags: ["攻击", "爆发", "血量收益"];
    readonly difficulty: "normal";
    readonly sortOrder: 9;
    readonly availability: {
        readonly classic: true;
        readonly duo: true;
        readonly pve: true;
        readonly roguelite: true;
        readonly hidden: false;
    };
    readonly implementation: {
        readonly mode: "code_driven";
        readonly handlerId: "fearless_assassin";
    };
    readonly diceFaces: [{
        readonly roll: 1;
        readonly name: "观察";
        readonly description: "本次不造成伤害。";
    }, {
        readonly roll: 2;
        readonly name: "无畏刺击";
        readonly description: "造成 2 点基础伤害，生命越健康额外伤害越高。";
    }, {
        readonly roll: 3;
        readonly name: "无畏刺击";
        readonly description: "造成 3 点基础伤害，生命越健康额外伤害越高。";
    }, {
        readonly roll: 4;
        readonly name: "无畏刺击";
        readonly description: "造成 4 点基础伤害，生命越健康额外伤害越高。";
    }, {
        readonly roll: 5;
        readonly name: "无畏刺击";
        readonly description: "造成 5 点基础伤害，生命越健康额外伤害越高。";
    }, {
        readonly roll: 6;
        readonly name: "无畏刺击";
        readonly description: "造成 6 点基础伤害，生命越健康额外伤害越高。";
    }];
    readonly role: "burst";
    readonly shortDescription: "血量越健康，攻击越凶。";
    readonly fullDescription: ["刺客（无畏）最大血量 15。", "投到 1 时无伤。", "满血时伤害 +3；血量高于 10 时伤害 +2；血量高于 5 时伤害 +1；血量小于等于 5 时造成普通伤害。"];
    readonly isImplemented: true;
}, {
    readonly id: "execution_assassin";
    readonly name: "刺客（斩）";
    readonly title: "attack";
    readonly description: "擅长收割残血目标。";
    readonly maxHp: 15;
    readonly avatarUrl: "";
    readonly spriteUrl: "";
    readonly tags: ["攻击", "收割", "斩杀", "残血收割"];
    readonly difficulty: "complex";
    readonly sortOrder: 10;
    readonly availability: {
        readonly classic: true;
        readonly duo: true;
        readonly pve: true;
        readonly roguelite: true;
        readonly hidden: false;
    };
    readonly implementation: {
        readonly mode: "code_driven";
        readonly handlerId: "execution_assassin";
    };
    readonly diceFaces: [{
        readonly roll: 1;
        readonly name: "潜伏";
        readonly description: "本次不造成伤害。";
    }, {
        readonly roll: 2;
        readonly name: "处决刺击";
        readonly description: "造成 2 点基础伤害；目标血量越低伤害越高，目标生命小于等于 3 时可处决。";
    }, {
        readonly roll: 3;
        readonly name: "处决刺击";
        readonly description: "造成 3 点基础伤害；目标血量越低伤害越高，目标生命小于等于 3 时可处决。";
    }, {
        readonly roll: 4;
        readonly name: "处决刺击";
        readonly description: "造成 4 点基础伤害；目标血量越低伤害越高，目标生命小于等于 3 时可处决。";
    }, {
        readonly roll: 5;
        readonly name: "处决刺击";
        readonly description: "造成 5 点基础伤害；目标血量越低伤害越高，目标生命小于等于 3 时可处决。";
    }, {
        readonly roll: 6;
        readonly name: "处决刺击";
        readonly description: "造成 6 点基础伤害；目标血量越低伤害越高，目标生命小于等于 3 时可处决。";
    }];
    readonly role: "attack";
    readonly shortDescription: "擅长收割残血目标。";
    readonly fullDescription: ["刺客（斩）最大血量 15。", "投到 1 时无伤。", "目标血量越低，伤害越高；目标血量低于最大血量的 3/4 时伤害 +1，低于 1/2 时伤害 +2。", "若目标当前血量小于等于 3，则可尝试处决；只有本次最终结算后生命扣到 0 才会斩杀。"];
    readonly isImplemented: true;
}, {
    readonly id: "self_destructor";
    readonly name: "自爆人";
    readonly title: "burst";
    readonly description: "用自己的血量换取爆发伤害。";
    readonly maxHp: 20;
    readonly avatarUrl: "";
    readonly spriteUrl: "";
    readonly tags: ["攻击", "爆发", "高风险"];
    readonly difficulty: "complex";
    readonly sortOrder: 11;
    readonly availability: {
        readonly classic: true;
        readonly duo: true;
        readonly pve: true;
        readonly roguelite: true;
        readonly hidden: false;
    };
    readonly implementation: {
        readonly mode: "code_driven";
        readonly handlerId: "self_destructor";
    };
    readonly diceFaces: [{
        readonly roll: 1;
        readonly name: "哑火";
        readonly description: "本次不造成伤害。";
    }, {
        readonly roll: 2;
        readonly name: "攻击";
        readonly description: "造成 2 点伤害。";
    }, {
        readonly roll: 3;
        readonly name: "攻击";
        readonly description: "造成 3 点伤害。";
    }, {
        readonly roll: 4;
        readonly name: "攻击";
        readonly description: "造成 4 点伤害。";
    }, {
        readonly roll: 5;
        readonly name: "攻击";
        readonly description: "造成 5 点伤害。";
    }, {
        readonly roll: 6;
        readonly name: "自爆";
        readonly description: "可扣除自己 1-9 点生命，对目标造成扣血量 x2 的普通伤害；也可普通攻击造成 6 点伤害。";
    }];
    readonly role: "burst";
    readonly shortDescription: "用自己的血量换取爆发伤害。";
    readonly fullDescription: ["自爆人最大血量 20。", "投到 1 时无伤。", "投到 6 时可以普通攻击造成 6 点伤害；也可以发动自爆：选择扣除自己 1 到 9 点血量，然后对目标造成扣血量 x2 的普通伤害，最高 18。", "扣血直接扣除自爆人血量，不经过自己的护盾；不能选择超过当前血量的扣血量。"];
    readonly isImplemented: true;
}, {
    readonly id: "war_knight";
    readonly name: "战争骑士";
    readonly title: "defense";
    readonly description: "攻势较稳，拥有护甲和少量回复。";
    readonly maxHp: 20;
    readonly avatarUrl: "";
    readonly spriteUrl: "";
    readonly tags: ["防御", "护甲", "续航"];
    readonly difficulty: "normal";
    readonly sortOrder: 12;
    readonly availability: {
        readonly classic: true;
        readonly duo: true;
        readonly pve: true;
        readonly roguelite: true;
        readonly hidden: false;
    };
    readonly implementation: {
        readonly mode: "code_driven";
        readonly handlerId: "war_knight";
    };
    readonly diceFaces: [{
        readonly roll: 1;
        readonly name: "钝击";
        readonly description: "造成 0 点伤害。";
    }, {
        readonly roll: 2;
        readonly name: "钝击";
        readonly description: "造成 1 点伤害。";
    }, {
        readonly roll: 3;
        readonly name: "战争复苏";
        readonly description: "可回复 3 点生命；普通攻击造成 2 点伤害。";
    }, {
        readonly roll: 4;
        readonly name: "钝击";
        readonly description: "造成 3 点伤害。";
    }, {
        readonly roll: 5;
        readonly name: "钝击";
        readonly description: "造成 4 点伤害。";
    }, {
        readonly roll: 6;
        readonly name: "钝击";
        readonly description: "造成 5 点伤害。";
    }];
    readonly role: "defense";
    readonly shortDescription: "攻势较稳，拥有护甲和少量回复。";
    readonly fullDescription: ["战争骑士最大血量 20。", "自己造成伤害 -1，最低为 0。", "护甲 +1。", "投到 3 时可以普通攻击造成 2 点伤害；也可以发动技能回复 3 点血，不能超过最大血量。"];
    readonly isImplemented: true;
}, {
    readonly id: "crescent_moon";
    readonly name: "残月者";
    readonly title: "burst";
    readonly description: "开局极脆，但会逐步恢复并打出高伤害。";
    readonly maxHp: 15;
    readonly avatarUrl: "";
    readonly spriteUrl: "";
    readonly tags: ["攻击", "爆发", "续航", "低血量"];
    readonly difficulty: "complex";
    readonly sortOrder: 13;
    readonly availability: {
        readonly classic: true;
        readonly duo: true;
        readonly pve: true;
        readonly roguelite: true;
        readonly hidden: false;
    };
    readonly implementation: {
        readonly mode: "code_driven";
        readonly handlerId: "crescent_moon";
    };
    readonly diceFaces: [{
        readonly roll: 1;
        readonly name: "残月斩";
        readonly description: "造成 3 点伤害。";
    }, {
        readonly roll: 2;
        readonly name: "残月斩";
        readonly description: "造成 4 点伤害。";
    }, {
        readonly roll: 3;
        readonly name: "残月斩";
        readonly description: "造成 5 点伤害。";
    }, {
        readonly roll: 4;
        readonly name: "残月斩";
        readonly description: "造成 6 点伤害。";
    }, {
        readonly roll: 5;
        readonly name: "残月斩";
        readonly description: "造成 7 点伤害。";
    }, {
        readonly roll: 6;
        readonly name: "满月一击";
        readonly description: "可造成固定 9 点伤害；普通攻击造成 8 点伤害。";
    }];
    readonly role: "burst";
    readonly shortDescription: "开局极脆，但会逐步恢复并打出高伤害。";
    readonly fullDescription: ["残月者最大血量 15，初始血量 3。", "每到自己行动开始时回复 2 点血，不能超过最大血量。", "普通伤害为骰点 +2。", "投到 6 时可以普通攻击造成 8 点伤害；也可以发动技能造成固定 9 点伤害。"];
    readonly isImplemented: true;
}, {
    readonly id: "fire_lord";
    readonly name: "火焰领主";
    readonly title: "attack";
    readonly description: "通过叠加火焰印记制造爆发窗口。";
    readonly maxHp: 16;
    readonly avatarUrl: "";
    readonly spriteUrl: "";
    readonly tags: ["攻击", "印记", "爆发"];
    readonly difficulty: "complex";
    readonly sortOrder: 14;
    readonly availability: {
        readonly classic: true;
        readonly duo: true;
        readonly pve: true;
        readonly roguelite: true;
        readonly hidden: false;
    };
    readonly implementation: {
        readonly mode: "code_driven";
        readonly handlerId: "fire_lord";
    };
    readonly diceFaces: [{
        readonly roll: 1;
        readonly name: "火焰打击";
        readonly description: "造成 1 点伤害，并给目标添加 1 层火焰印记。";
    }, {
        readonly roll: 2;
        readonly name: "火焰打击";
        readonly description: "造成 2 点伤害，并给目标添加 1 层火焰印记。";
    }, {
        readonly roll: 3;
        readonly name: "火焰印记";
        readonly description: "可不造成伤害并添加 1 层火焰印记；普通攻击不造成伤害。";
    }, {
        readonly roll: 4;
        readonly name: "火焰打击";
        readonly description: "造成 4 点伤害，并给目标添加 1 层火焰印记。";
    }, {
        readonly roll: 5;
        readonly name: "火焰打击";
        readonly description: "造成 5 点伤害，并给目标添加 1 层火焰印记。";
    }, {
        readonly roll: 6;
        readonly name: "火焰爆发";
        readonly description: "可引爆目标火焰印记，每层造成 3 点普通伤害并清空；普通攻击造成 6 点伤害并添加 1 层印记。";
    }];
    readonly role: "attack";
    readonly shortDescription: "通过叠加火焰印记制造爆发窗口。";
    readonly fullDescription: ["火焰领主最大血量 16。", "投到 3 时普通攻击不造成伤害且不添加火焰印记；也可以发动火焰印记技能，不造成伤害并添加 1 层火焰印记。", "每次普通攻击敌方时，给目标添加 1 层火焰印记。", "投到 6 时可以普通攻击造成 6 点伤害并添加 1 层火焰印记；也可以发动技能，爆发目标身上的火焰印记，每层造成 3 点普通伤害，爆发后清空目标火焰印记。"];
    readonly isImplemented: true;
}, {
    readonly id: "mountain_shield";
    readonly name: "山盾";
    readonly title: "defense";
    readonly description: "用架盾状态保护自己和队友。";
    readonly maxHp: 25;
    readonly avatarUrl: "";
    readonly spriteUrl: "";
    readonly tags: ["防御", "护甲", "团队"];
    readonly difficulty: "complex";
    readonly sortOrder: 15;
    readonly availability: {
        readonly classic: true;
        readonly duo: true;
        readonly pve: true;
        readonly roguelite: true;
        readonly hidden: false;
    };
    readonly implementation: {
        readonly mode: "code_driven";
        readonly handlerId: "mountain_shield";
    };
    readonly diceFaces: [{
        readonly roll: 1;
        readonly name: "盾击";
        readonly description: "造成 0 点伤害；架盾时仍为 0 点。";
    }, {
        readonly roll: 2;
        readonly name: "盾击";
        readonly description: "造成 1 点伤害；架盾时造成 0 点。";
    }, {
        readonly roll: 3;
        readonly name: "盾击";
        readonly description: "造成 2 点伤害；架盾时造成 1 点。";
    }, {
        readonly roll: 4;
        readonly name: "盾击";
        readonly description: "造成 3 点伤害；架盾时造成 2 点。";
    }, {
        readonly roll: 5;
        readonly name: "盾击";
        readonly description: "造成 4 点伤害；架盾时造成 3 点。";
    }, {
        readonly roll: 6;
        readonly name: "架盾";
        readonly description: "可进入架盾状态；普通攻击造成 5 点伤害，架盾时造成 4 点。";
    }];
    readonly role: "defense";
    readonly shortDescription: "用架盾状态保护自己和队友。";
    readonly fullDescription: ["山盾最大血量 25。", "自己造成伤害 -1，护甲 +1。", "投到 6 时可以普通攻击造成 5 点伤害，若正在架盾则造成 4 点伤害；也可以发动技能进入架盾状态，不额外造成伤害。", "架盾状态下，山盾自己的伤害额外 -1，自己的护甲额外 +1，所有队友包括山盾自己获得团体护甲 +2。", "每到山盾行动开始时先投骰，1-4 继续架盾，5-6 结束架盾。"];
    readonly isImplemented: true;
}];
