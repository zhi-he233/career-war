export declare const GENERATED_ROGUELITE_EVENTS: readonly [{
    readonly id: "cracked_dice";
    readonly name: "裂纹骰子";
    readonly rarity: "common";
    readonly stage: "early";
    readonly description: "你捡到一颗有裂纹的骰子，里面似乎还残留着上一位挑战者的运气。";
    readonly choices: readonly [{
        readonly label: "用它投一次";
        readonly effect: "从普通成长池三选一";
        readonly cost: "下一场战斗开始时失去 3 生命";
        readonly effects: readonly [{
            readonly type: "reward_choice";
            readonly rewardPool: "growth";
        }];
        readonly costs: readonly [{
            readonly type: "lose_hp";
            readonly value: 3;
            readonly note: "TODO: 后续可改为下一场战斗开始时结算。";
        }];
    }, {
        readonly label: "砸碎取芯";
        readonly effect: "获得 20 金币";
        readonly cost: "没有成长奖励";
        readonly effects: readonly [{
            readonly type: "gain_gold";
            readonly value: 20;
        }];
    }];
    readonly notes: "前期教学，低风险。";
}, {
    readonly id: "old_shield_wall";
    readonly name: "旧盾墙";
    readonly rarity: "common";
    readonly stage: "early";
    readonly description: "一面残破的大盾插在墙边，盾面上全是拳印。";
    readonly choices: readonly [{
        readonly label: "拆下护板";
        readonly effect: "获得 4 护盾或防御类普通成长";
        readonly cost: "失去 20 金币";
        readonly effects: readonly [{
            readonly type: "gain_start_shield_next_battle";
            readonly value: 4;
        }];
        readonly costs: readonly [{
            readonly type: "todo";
            readonly note: "TODO: 金币消耗尚未接入。";
        }];
    }, {
        readonly label: "绕过去";
        readonly effect: "回复 5 生命";
        readonly cost: "没有额外奖励";
        readonly effects: readonly [{
            readonly type: "heal";
            readonly value: 5;
        }];
    }];
    readonly notes: "护盾流入口。";
}, {
    readonly id: "blood_stained_glove";
    readonly name: "染血拳套";
    readonly rarity: "common";
    readonly stage: "early";
    readonly description: "擂台角落放着一副旧拳套，拳套还没完全干。";
    readonly choices: readonly [{
        readonly label: "戴上拳套";
        readonly effect: "从普通成长池三选一（伤害类）";
        readonly cost: "失去 3 生命";
        readonly effects: readonly [{
            readonly type: "reward_choice";
            readonly rewardPool: "growth";
        }];
        readonly costs: readonly [{
            readonly type: "lose_hp";
            readonly value: 3;
        }];
    }, {
        readonly label: "擦掉血迹";
        readonly effect: "回复 5 生命";
        readonly cost: "失去一次奖励刷新机会";
        readonly effects: readonly [{
            readonly type: "heal";
            readonly value: 5;
        }];
        readonly costs: readonly [{
            readonly type: "todo";
            readonly note: "TODO: 奖励刷新机会尚未接入。";
        }];
    }];
    readonly notes: "爆发流入口。";
}, {
    readonly id: "dice_gambler";
    readonly name: "骰子赌徒";
    readonly rarity: "uncommon";
    readonly stage: "any";
    readonly description: "一个赌徒拦住你，提出用一场投骰决定战利品归属。";
    readonly choices: readonly [{
        readonly label: "跟他赌";
        readonly effect: "预览稀有奖励池，投出 4 点或以上可从稀有奖励池三选一";
        readonly cost: "若投出 1-3，下一场敌人生命 +6，伤害 +1";
        readonly effects: readonly [{
            readonly type: "reward_choice";
            readonly rewardPool: "rare";
            readonly note: "TODO: 稀有奖励池暂时降级为基础成长池。";
        }];
        readonly costs: readonly [{
            readonly type: "todo";
            readonly note: "TODO: 投骰胜负与下一场敌人强化尚未接入。";
        }];
    }, {
        readonly label: "不赌，收买他";
        readonly effect: "获得 20 金币";
        readonly cost: "失去 3 生命";
        readonly effects: readonly [{
            readonly type: "gain_gold";
            readonly value: 20;
        }];
        readonly costs: readonly [{
            readonly type: "lose_hp";
            readonly value: 3;
        }];
    }];
    readonly notes: "骰点对决。TODO: 稀有奖励池事件抽取逻辑尚未接入。";
}, {
    readonly id: "black_market_map";
    readonly name: "黑市地图";
    readonly rarity: "uncommon";
    readonly stage: "mid";
    readonly description: "墙上贴着一张被撕烂的地图，标出了一条通往黑市的暗路。";
    readonly choices: readonly [{
        readonly label: "走暗路";
        readonly effect: "下一层 50% 概率额外生成商店或奖励房";
        readonly cost: "下一场敌人额外获得 4 护盾";
        readonly effects: readonly [{
            readonly type: "todo";
            readonly note: "TODO: 商店/奖励房出现概率变化尚未接入。";
        }];
        readonly costs: readonly [{
            readonly type: "todo";
            readonly note: "TODO: 下一场敌人护盾变化尚未接入。";
        }];
    }, {
        readonly label: "记下路线";
        readonly effect: "获得 20 金币";
        readonly cost: "没有地图收益";
        readonly effects: readonly [{
            readonly type: "gain_gold";
            readonly value: 20;
        }];
    }];
    readonly notes: "地图事件。TODO: 额外生成房间逻辑尚未接入。";
}, {
    readonly id: "armor_debt";
    readonly name: "欠债护甲";
    readonly rarity: "uncommon";
    readonly stage: "mid";
    readonly description: "铁匠愿意先把护甲借给你，但要你之后用战利品来还。";
    readonly choices: readonly [{
        readonly label: "先穿再说";
        readonly effect: "获得护甲或开局护盾成长";
        readonly cost: "下一次奖励少一个选项";
        readonly effects: readonly [{
            readonly type: "gain_start_shield_next_battle";
            readonly value: 4;
        }];
        readonly costs: readonly [{
            readonly type: "todo";
            readonly note: "TODO: 下一次奖励少一个选项尚未接入。";
        }];
    }, {
        readonly label: "拒绝赊账";
        readonly effect: "获得 20 金币";
        readonly cost: "没有防御收益";
        readonly effects: readonly [{
            readonly type: "gain_gold";
            readonly value: 20;
        }];
    }];
    readonly notes: "构筑交换。TODO: 奖励选项减少逻辑尚未接入。";
}, {
    readonly id: "blood_pool";
    readonly name: "斗场血池";
    readonly rarity: "rare";
    readonly stage: "mid";
    readonly description: "血池里浮着破碎的职业徽章，靠近时能听到心跳声。";
    readonly choices: readonly [{
        readonly label: "喝一口";
        readonly effect: "从普通成长池三选一（吸血/回复类）";
        readonly cost: "失去 6 生命";
        readonly effects: readonly [{
            readonly type: "reward_choice";
            readonly rewardPool: "growth";
        }];
        readonly costs: readonly [{
            readonly type: "lose_hp";
            readonly value: 6;
        }];
    }, {
        readonly label: "洗掉伤口";
        readonly effect: "回复 15 生命";
        readonly cost: "无法获得奖励";
        readonly effects: readonly [{
            readonly type: "heal";
            readonly value: 15;
        }];
    }];
    readonly notes: "高风险回复。";
}, {
    readonly id: "sealed_skill_book";
    readonly name: "封印技能书";
    readonly rarity: "rare";
    readonly stage: "mid";
    readonly description: "一本技能书被锁链缠住，封面写着“只给敢赌命的人”。";
    readonly choices: readonly [{
        readonly label: "撕开封印";
        readonly effect: "从角色技能池三选一";
        readonly cost: "获得一个临时负面效果";
        readonly effects: readonly [{
            readonly type: "reward_choice";
            readonly rewardPool: "character_skill";
            readonly note: "TODO: 事件角色技能池暂时降级为基础成长池。";
        }];
        readonly costs: readonly [{
            readonly type: "todo";
            readonly note: "TODO: 临时负面效果尚未接入。";
        }];
    }, {
        readonly label: "卖给商人";
        readonly effect: "获得 45 金币";
        readonly cost: "失去技能机会";
        readonly effects: readonly [{
            readonly type: "gain_gold";
            readonly value: 45;
        }];
    }];
    readonly notes: "角色技能入口。TODO: 临时负面效果尚未接入。";
}, {
    readonly id: "gunpowder_barrel";
    readonly name: "火药桶";
    readonly rarity: "common";
    readonly stage: "any";
    readonly description: "角落堆着几桶火药，旁边还有枪手留下的弹壳。";
    readonly choices: readonly [{
        readonly label: "装进拳套";
        readonly effect: "下一场第一次攻击伤害 +4";
        readonly cost: "开局失去 3 生命";
        readonly effects: readonly [{
            readonly type: "todo";
            readonly note: "TODO: 下一场第一次攻击伤害变化尚未接入。";
        }];
        readonly costs: readonly [{
            readonly type: "lose_hp";
            readonly value: 3;
        }];
    }, {
        readonly label: "卖掉火药";
        readonly effect: "获得 20 金币";
        readonly cost: "无战斗强化";
        readonly effects: readonly [{
            readonly type: "gain_gold";
            readonly value: 20;
        }];
    }];
    readonly notes: "先手爆发。";
}, {
    readonly id: "dragon_shadow";
    readonly name: "龙影掠过";
    readonly rarity: "rare";
    readonly stage: "late";
    readonly description: "一道龙影从塔顶掠过，短暂照亮了你前方的路线。";
    readonly choices: readonly [{
        readonly label: "追随龙影";
        readonly effect: "从稀有奖励池三选一（偏向穿透类）";
        readonly cost: "下一场敌人伤害 +1";
        readonly effects: readonly [{
            readonly type: "reward_choice";
            readonly rewardPool: "rare";
            readonly note: "TODO: 稀有奖励池暂时降级为基础成长池。";
        }];
        readonly costs: readonly [{
            readonly type: "todo";
            readonly note: "TODO: 下一场敌人伤害变化尚未接入。";
        }];
    }, {
        readonly label: "原地观察";
        readonly effect: "看见后续 3 层路线信息";
        readonly cost: "没有奖励";
        readonly effects: readonly [{
            readonly type: "todo";
            readonly note: "TODO: 路线预览尚未接入。";
        }];
    }];
    readonly notes: "后期稀有事件。TODO: 稀有奖励池和路线预览事件逻辑尚未接入。";
}, {
    readonly id: "shield_forge";
    readonly name: "护盾熔炉";
    readonly rarity: "uncommon";
    readonly stage: "any";
    readonly description: "熔炉中流动着蓝色护盾碎片，似乎能把防御转化为攻击。";
    readonly choices: readonly [{
        readonly label: "投入护盾碎片";
        readonly effect: "从普通成长池三选一（护盾/盾击类）";
        readonly cost: "失去 6 生命或 20 金币";
        readonly effects: readonly [{
            readonly type: "reward_choice";
            readonly rewardPool: "growth";
        }];
        readonly costs: readonly [{
            readonly type: "lose_hp";
            readonly value: 6;
            readonly note: "TODO: 之后可让玩家在生命和金币代价中选择。";
        }];
    }, {
        readonly label: "冷却熔炉";
        readonly effect: "回复 10 生命";
        readonly cost: "没有奖励";
        readonly effects: readonly [{
            readonly type: "heal";
            readonly value: 10;
        }];
    }];
    readonly notes: "护盾流核心事件。";
}, {
    readonly id: "reaper_contract";
    readonly name: "收割契约";
    readonly rarity: "rare";
    readonly stage: "late";
    readonly description: "一张黑色契约浮在半空，上面写着：击败残血者，获得更多。";
    readonly choices: readonly [{
        readonly label: "签下契约";
        readonly effect: "从普通成长池三选一（收割/斩杀类）";
        readonly cost: "低于半血时受到伤害 +2";
        readonly effects: readonly [{
            readonly type: "reward_choice";
            readonly rewardPool: "growth";
        }];
        readonly costs: readonly [{
            readonly type: "todo";
            readonly note: "TODO: 低血受伤变化尚未接入。";
        }];
    }, {
        readonly label: "烧掉契约";
        readonly effect: "删除一个负面效果";
        readonly cost: "失去 3 生命";
        readonly effects: readonly [{
            readonly type: "todo";
            readonly note: "TODO: 删除负面效果尚未接入。";
        }];
        readonly costs: readonly [{
            readonly type: "lose_hp";
            readonly value: 3;
        }];
    }];
    readonly notes: "后期风险收益。TODO: 负面效果删除尚未接入事件流程。";
}, {
    readonly id: "fake_treasure";
    readonly name: "假宝箱";
    readonly rarity: "common";
    readonly stage: "any";
    readonly description: "你发现一个宝箱，但锁孔旁边有新鲜的抓痕。";
    readonly choices: readonly [{
        readonly label: "强行打开";
        readonly effect: "获得随机奖励（20 金币 / 4 护盾 / 从普通成长池三选一）";
        readonly cost: "50% 概率失去 3 生命";
        readonly effects: readonly [{
            readonly type: "reward_choice";
            readonly rewardPool: "growth";
            readonly note: "TODO: 随机奖励暂时降级为基础成长池三选一。";
        }];
        readonly costs: readonly [{
            readonly type: "todo";
            readonly note: "TODO: 50% 概率生命损失尚未接入。";
        }];
    }, {
        readonly label: "谨慎拆锁";
        readonly effect: "获得 20 金币";
        readonly cost: "没有随机奖励";
        readonly effects: readonly [{
            readonly type: "gain_gold";
            readonly value: 20;
        }];
    }];
    readonly notes: "普通随机事件。";
}, {
    readonly id: "mirror_duel";
    readonly name: "镜像决斗";
    readonly rarity: "rare";
    readonly stage: "mid";
    readonly description: "镜子里出现了另一个你，他的拳头比你更快。";
    readonly choices: readonly [{
        readonly label: "接受决斗";
        readonly effect: "下一场敌人生命 +6，伤害 +1；胜利后从稀有奖励池三选一";
        readonly cost: "立即失去 3 生命";
        readonly effects: readonly [{
            readonly type: "reward_choice";
            readonly rewardPool: "rare";
            readonly note: "TODO: 稀有奖励池暂时降级为基础成长池。";
        }];
        readonly costs: readonly [{
            readonly type: "lose_hp";
            readonly value: 3;
        }, {
            readonly type: "todo";
            readonly note: "TODO: 下一场敌人生命和伤害变化尚未接入。";
        }];
    }, {
        readonly label: "打碎镜子";
        readonly effect: "从普通成长池三选一";
        readonly cost: "失去 20 金币";
        readonly effects: readonly [{
            readonly type: "reward_choice";
            readonly rewardPool: "growth";
        }];
        readonly costs: readonly [{
            readonly type: "todo";
            readonly note: "TODO: 金币消耗尚未接入。";
        }];
    }];
    readonly notes: "挑战事件。TODO: 稀有奖励池事件抽取逻辑尚未接入。";
}, {
    readonly id: "broken_banner";
    readonly name: "断裂战旗";
    readonly rarity: "common";
    readonly stage: "early";
    readonly description: "一面断裂战旗倒在路边，上面写着上一支队伍的名字。";
    readonly choices: readonly [{
        readonly label: "举起战旗";
        readonly effect: "获得生命上限或战斗本能成长";
        readonly cost: "下一场敌人伤害 +1";
        readonly effects: readonly [{
            readonly type: "reward_choice";
            readonly rewardPool: "growth";
        }];
        readonly costs: readonly [{
            readonly type: "todo";
            readonly note: "TODO: 下一场敌人伤害变化尚未接入。";
        }];
    }, {
        readonly label: "埋葬战旗";
        readonly effect: "回复 5 生命";
        readonly cost: "没有成长";
        readonly effects: readonly [{
            readonly type: "heal";
            readonly value: 5;
        }];
    }];
    readonly notes: "叙事补强。";
}, {
    readonly id: "coin_rain";
    readonly name: "金币雨";
    readonly rarity: "uncommon";
    readonly stage: "any";
    readonly description: "斗技场上方突然落下一阵金币，观众在欢呼。";
    readonly choices: readonly [{
        readonly label: "冲进去捡";
        readonly effect: "获得 45 金币";
        readonly cost: "失去 3 生命";
        readonly effects: readonly [{
            readonly type: "gain_gold";
            readonly value: 45;
        }];
        readonly costs: readonly [{
            readonly type: "lose_hp";
            readonly value: 3;
        }];
    }, {
        readonly label: "保持警惕";
        readonly effect: "获得 4 护盾";
        readonly cost: "没有金币";
        readonly effects: readonly [{
            readonly type: "gain_start_shield_next_battle";
            readonly value: 4;
        }];
    }];
    readonly notes: "金币事件。";
}, {
    readonly id: "cursed_dice_cup";
    readonly name: "诅咒骰盅";
    readonly rarity: "rare";
    readonly stage: "any";
    readonly description: "骰盅自己开始摇晃，里面传来低笑声。";
    readonly choices: readonly [{
        readonly label: "掀开骰盅";
        readonly effect: "获得骰子类奖励";
        readonly cost: "获得一个负面效果";
        readonly effects: readonly [{
            readonly type: "reward_choice";
            readonly rewardPool: "growth";
        }];
        readonly costs: readonly [{
            readonly type: "todo";
            readonly note: "TODO: 负面效果尚未接入。";
        }];
    }, {
        readonly label: "封住骰盅";
        readonly effect: "删除一个负面效果";
        readonly cost: "失去 20 金币";
        readonly effects: readonly [{
            readonly type: "todo";
            readonly note: "TODO: 删除负面效果尚未接入。";
        }];
        readonly costs: readonly [{
            readonly type: "todo";
            readonly note: "TODO: 金币消耗尚未接入。";
        }];
    }];
    readonly notes: "骰子流事件。TODO: 负面效果尚未接入事件流程。";
}, {
    readonly id: "flame_trial";
    readonly name: "火焰试炼";
    readonly rarity: "uncommon";
    readonly stage: "mid";
    readonly description: "火焰领主的标记在地面燃烧，只有攻击欲望足够强的人才能通过。";
    readonly choices: readonly [{
        readonly label: "踏入火圈";
        readonly effect: "从普通成长池三选一（火焰/伤害类）";
        readonly cost: "下一场开始时受到 3 伤害";
        readonly effects: readonly [{
            readonly type: "reward_choice";
            readonly rewardPool: "growth";
        }];
        readonly costs: readonly [{
            readonly type: "lose_hp";
            readonly value: 3;
            readonly note: "TODO: 后续可改为下一场战斗开始时结算。";
        }];
    }, {
        readonly label: "绕过火圈";
        readonly effect: "回复 5 生命";
        readonly cost: "失去奖励机会";
        readonly effects: readonly [{
            readonly type: "heal";
            readonly value: 5;
        }];
    }];
    readonly notes: "火焰流入口。";
}, {
    readonly id: "vampire_altar";
    readonly name: "吸血祭坛";
    readonly rarity: "uncommon";
    readonly stage: "mid";
    readonly description: "祭坛上刻着一句话：用血换血，才算公平。";
    readonly choices: readonly [{
        readonly label: "献血";
        readonly effect: "从普通成长池三选一（吸血/回复类）";
        readonly cost: "失去 6 生命";
        readonly effects: readonly [{
            readonly type: "reward_choice";
            readonly rewardPool: "growth";
        }];
        readonly costs: readonly [{
            readonly type: "lose_hp";
            readonly value: 6;
        }];
    }, {
        readonly label: "破坏祭坛";
        readonly effect: "获得 20 金币";
        readonly cost: "无法获得吸血奖励";
        readonly effects: readonly [{
            readonly type: "gain_gold";
            readonly value: 20;
        }];
    }];
    readonly notes: "吸血流入口。";
}, {
    readonly id: "cycle_bell";
    readonly name: "轮回钟声";
    readonly rarity: "rare";
    readonly stage: "late";
    readonly description: "远处传来轮回钟声，斗技塔即将进入下一轮加码。";
    readonly choices: readonly [{
        readonly label: "提前适应";
        readonly effect: "从稀有奖励池三选一";
        readonly cost: "后续 3 场敌人伤害 +1";
        readonly effects: readonly [{
            readonly type: "reward_choice";
            readonly rewardPool: "rare";
            readonly note: "TODO: 稀有奖励池暂时降级为基础成长池。";
        }];
        readonly costs: readonly [{
            readonly type: "todo";
            readonly note: "TODO: 后续 3 场敌人伤害变化尚未接入。";
        }];
    }, {
        readonly label: "稳住节奏";
        readonly effect: "回复 12 生命";
        readonly cost: "不获得奖励";
        readonly effects: readonly [{
            readonly type: "heal";
            readonly value: 12;
        }];
    }];
    readonly notes: "进入下一轮循环的信号。TODO: 稀有奖励池事件抽取逻辑尚未接入。";
}];
