import { exec } from "child_process"
import * as util from 'minecraft-server-util';

//默认配置项
let return_guest_code = true//是否允许非主人运行，不建议更改
let outforward = false//是否以合并转发形式回复，可避免刷屏
let ipaddr = '10.249.249.11'//服务器ip地址
let ipport = 25575//rcon端口

let settingsreg = new RegExp('^#mcsu设置(权限||合并转发|ip地址|rcon端口)*(.*)*')

export class mcsu extends plugin {
	constructor() {
		super({
			name: 'mc服务器管理工具',
			event: 'message',
			priority: 500,
			rule: [
				{
					reg: "^#mc (.*)",
					fnc: 'mcsu'
				},
				{
					reg:"^#mc状态(.*)",
					fnc:'mcstat'
				},
				{
					reg: settingsreg,
					fnc: 'settings',
					permission: 'master'
				}]
		})
	}

	async mcsu(e) {
		if (return_guest_code) {
			if (!e.isMaster) return e.reply("主人不允许你使用此插件哦！")
		}
		try {
			const content = e.message[0].text.split("#mc ")[1]
			if (content === undefined) return

			var client = new util.RCON();

			client.on('message', async (data) => {
    			let output = (data);
				if (typeof output !== 'string') output = JSON.stringify(output, null);	
				var obj = JSON.parse(output);	
				var mes = obj.message;
				var rid = obj.requestID;
				if (mes === ""){
					var out = "指令"+rid+"：处理完成"
				}else{
					var out = "指令"+rid+":处理完成"+"\n返回信息："+mes
				}
				if (output === undefined) return e.reply("程序无返回值");
				if (outforward) {
					await sendForwardMsg(e, out)
				} else {
					await e.reply(out)
				}
    			await client.close();
			});

			var connectOpts = {
				timeout: 1000 * 5
			};

			var loginOpts = {
    			timeout: 1000 * 5
			};

			(async () => {
    			await client.connect(ipaddr, ipport, connectOpts);
    			await client.login('NJTechnjtumc114514', loginOpts);
    			await client.run(content);
			})();
		} catch (error) {
			await e.reply('错误：\n' + error.message)
			console.log(error)
		}
	}

	async mcstat(e){
		let content = e.message[0].text.split("#mc状态")[1]
		const options = {
    	timeout: 1000 * 5, // timeout in milliseconds
    	enableSRV: true // SRV record lookup
		};
		if (content === "") {
			content ='play.njtumc.org';
			console.log(content);
		}
		util.status(content, 25565, options)
    		.then((result) =>{
				if (typeof result !== 'string') result = JSON.stringify(result, null);
				var obj = JSON.parse(result);
				var version = obj.version.name;
				var players = obj.players.online;
				var motd = obj.motd.clean;
				var message = "游戏名称："+motd+"\n版本:"+version+"\n在线人数："+players;
				if (result === undefined) return e.reply("程序无返回值");
				if (outforward) {
					sendForwardMsg(e, message)
				} else {
					e.reply(message)
				}
				})
			.catch((error) => {
				e.reply("你所查询的服务器不存在或未开服！");
			})
			}

	async settings(e) {
		let regRet = settingsreg.exec(e.msg)
		let name = regRet[1]
		let value = regRet[2]
		switch (name) {
			case "权限":
				return_guest_code = eval(value)
				break;
			case "合并转发":
				outforward = eval(value)
				break;
			case "ip地址":
				ipaddr = String(value)
				break;
			case "rcon端口":
				ipport = value
				break;
		}
		let settingsmsg = [
			"仅主人可运行："+return_guest_code,
			"\n使用合并转发回复："+outforward,
			"\n服务器ip地址："+ipaddr,
			"\n服务器rcon端口："+ipport,
		]
		e.reply(settingsmsg)
	}
}


async function sendForwardMsg(e, data) {
	let forwardMsg = [{ message: e.msg, nickname: e.sender.card || e.sender.nickname, user_id: e.sender.user_id }]
	if (data.length > 10000) {
		forwardMsg.push({
			message: `结果过长，将只显示10000字 (${((10000 / data.length) * 100).toFixed(2)}%)`,
			nickname: Bot.nickname, user_id: Bot.uin
		})
		data = data.substring(0, 10000)
	}
	forwardMsg.push({ message: data, nickname: Bot.nickname, user_id: Bot.uin })
	if (e.isGroup) {
		forwardMsg = await e.group.makeForwardMsg(forwardMsg)
	} else {
		forwardMsg = await e.friend.makeForwardMsg(forwardMsg)
	}
	e.reply(forwardMsg)
}