import wixData from 'wix-data'
import { orders } from "wix-events.v2"
import { elevate } from "wix-auth"

const EVENT_ID = "86ac2d0f-e2dc-4c86-9c10-efeb710aa570"
const getOrderElevated = elevate(orders.getOrder)
const TEST_COUPON = "13261326"

const STATUS_APPROVED = "19c835c8-244d-4fcd-a8a7-d0417bc90dde"
const STATUS_ERROR = "80dc2481-bc51-4449-9380-e960e153dc83"

export async function affiliates_beforeInsert(item, context) {
    return syncAffiliateData(item)
}

export async function affiliates_beforeUpdate(item, context) {
    return syncAffiliateData(item)
}

async function syncAffiliateData(item) {
    if (item.refferance) {
        item.userId = item.refferance
        try {
            const member = await wixData.get("Members/PrivateMembersData", item.refferance, { suppressAuth: true })
            if (member) {
                item.email = member.loginEmail
            }
        } catch (e) {}
    }

    if (item.affId) {
        item.personalUrl = `https://www.tonyrobbins.co.il/?affId=${item.affId}`
    }

    return item
}

export async function affiliateSales_afterInsert(item, context) {
    const orderNumber = item.orderNumber
    const affId = item.affId
    const recordId = item._id

    try {
        const orderData = await getOrderElevated({
            eventId: EVENT_ID,
            orderNumber: orderNumber
        }, {
            fieldset: ['DETAILS', 'FORM', 'INVOICE']
        })

        if (!orderData) {
            throw new Error("Order not found")
        }

        let fullPrice = 0
        let isTestMode = false

        if (orderData.invoice) {
            const usedCoupon = orderData.invoice.discount?.code

            if (usedCoupon === TEST_COUPON) {
                fullPrice = Number(orderData.invoice.subTotal?.value || 0)
                isTestMode = true
            } else {
                fullPrice = Number(orderData.invoice.grandTotal?.value || 0)
            }
        } else {
            fullPrice = Number(orderData.totalPrice?.value || 0)
        }

        const affiliateRecord = await wixData.query("affiliates")
            .eq("affId", affId)
            .find({ suppressAuth: true })

        if (affiliateRecord.items.length === 0) {
            throw new Error("Affiliate not found")
        }

        const agent = affiliateRecord.items[0]
        let profitPercentage = agent.profit

        if (typeof profitPercentage === 'string') {
            profitPercentage = parseFloat(profitPercentage.replace('%', ''))
        }

        const userProfit = (fullPrice * profitPercentage) / 100

        const itemToUpdate = await wixData.get("affiliateSales", recordId, { suppressAuth: true })

        itemToUpdate.fullPrice = fullPrice
        itemToUpdate.userProfit = userProfit
        itemToUpdate.saleStatus = STATUS_APPROVED
        itemToUpdate.notificationSent = false

        if (isTestMode) {
            itemToUpdate.saleStatus = "בדיקה (קופון)"
        } else if (fullPrice === 0) {
            itemToUpdate.saleStatus = "אושר (ללא תשלום)"
        }

        await wixData.update("affiliateSales", itemToUpdate, { suppressAuth: true })

    } catch (error) {
        try {
            const errorItem = await wixData.get("affiliateSales", recordId, { suppressAuth: true })
            errorItem.saleStatus = STATUS_ERROR
            errorItem.err = error.message || error.toString()
            await wixData.update("affiliateSales", errorItem, { suppressAuth: true })
        } catch (updateErr) {}
    }

    return item
}