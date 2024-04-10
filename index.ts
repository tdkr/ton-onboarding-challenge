
// write your NFT miner here
import { Address, toNano, TonClient } from "ton"
import { getHttpEndpoint } from "@orbs-network/ton-access"
import { BN } from "bn.js"
import { unixNow } from "./src/lib/utils"
import { MineMessageParams, Queries } from "./src/giver/NftGiver.data"

async function main() {
    const wallet = Address.parse('0QDlOrTsAsMXQ-6scTc-qKy2nmyzt-LGxVfwUA0Md_-TeeN9')
    const collection = Address.parse('EQDk8N7xM5D669LC2YACrseBJtDyFqwtSPCNhRWXU7kjEptX')
    // const collection = Address.parse('EQATpz8LEqPT8mGWww9jnvFZ3C5j2kYgZK4te7B3UwFwFITQ')
    console.log("wallet", wallet)
    console.log("collection", collection)

    const endpoint = await getHttpEndpoint({
        network: "testnet"
    })

    console.log("endpoint", endpoint)

    const client = new TonClient({ endpoint })
    const miningData = await client.callGetMethod(collection, "get_mining_data")

    console.log("miningData", miningData)

    const parseStackNum = (sn:any) => new BN(sn[1].substring(2), 'hex')
    const complexity = parseStackNum(miningData.stack[0])
    const last_success = parseStackNum(miningData.stack[1])
    const seed = parseStackNum(miningData.stack[2])
    const target_delta = parseStackNum(miningData.stack[3])
    const min_cpl = parseStackNum(miningData.stack[4])
    const max_cpl = parseStackNum(miningData.stack[5])

    console.log('complexity', complexity)
    console.log('last_success', last_success.toString())
    console.log('seed', seed)
    console.log('target_delta', target_delta.toString())
    console.log('min_cpl', min_cpl.toString())
    console.log('max_cpl', max_cpl.toString())

    const mineParams : MineMessageParams = {
        expire: unixNow() + 300,
        mintTo: wallet,
        data1: new BN(0),
        seed,
    }
    let msg = Queries.mine(mineParams)
    let progress = 0
    console.log("mine...", mineParams, msg)

    while (new BN(msg.hash(), 'be').gt(complexity)) {
        progress += 1
        console.clear()
        console.log(`挖矿开始: 请等待 30-60 秒以挖掘你的 nft`)
        console.log(' ')
        console.log(`⛏ 已挖掘 ${progress} 个哈希！最新的: `, new BN(msg.hash(), 'be').toString())

        mineParams.expire = unixNow() + 300
        mineParams.data1.iaddn(1)
        msg = Queries.mine(mineParams)
    }

    console.log(' ')
    console.log('💎 任务完成：找到小于 pow_complexity 的 msg_hash 了！');
    console.log(' ')
    console.log('msg_hash: ', new BN(msg.hash(), 'be').toString())
    console.log('pow_complexity: ', complexity.toString())
    console.log('msg_hash < pow_complexity: ', new BN(msg.hash(), 'be').lt(complexity))

    console.log(' ');
    console.log("💣 警告！一旦您找到哈希，您应该迅速发送交易。");
    console.log("如果其他人在您之前发送交易，seed会改变，您将不得不重新找到哈希！");
    console.log(' ');

    // flags 只在用户友好的地址形式中有效
    const collectionAddr = collection.toFriendly({
        urlSafe: true,
        bounceable: true,
    })

    // 我们必须将 TON 转换为 nanoTON
    const amountToSend = toNano('0.05').toString()
    // 这里的 BOC 表示 cell 包
    const preparedBodyCell = msg.toBoc().toString('base64url')
    // const preparedBodyCell = msg.toBoc().toString('base64')

    // 最终构建 url 的方法
    const tonDeepLink = (address: string, amount: string, body: string) => {
        return `ton://transfer/${address}?amount=${amount}?bin=${body}`
    }

    const link = tonDeepLink(collectionAddr, amountToSend, preparedBodyCell)

    console.log('🚀 领取NFT的链接：')
    console.log(link);

    const qrcode = require("qrcode-terminal")
    qrcode.generate(link, {small: true}, function(qrcode: any) {
        console.log('🚀 用Tonkeeper挖掘NFT的链接（在测试网模式下使用）：')
        console.log(qrcode);
        console.log('* 如果二维码仍然太大，请在终端运行脚本。（或者缩小字体）')
    })
}

main()