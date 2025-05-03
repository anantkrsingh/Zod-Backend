const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();


const reportCreation = async (req, res) => {
    const { creationId, reason } = req.body;
    const { userId } = req.user;

    try {
        const report = await prisma.reports.create({
            data: {
                creationId,
                userId,
                reason
            }
        })

        return res.status(200).json({
            message: "Creation reported successfully",
            report
        })
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            message: "Internal server error",
            error
        })
    }

}


module.exports = {
    reportCreation
}

