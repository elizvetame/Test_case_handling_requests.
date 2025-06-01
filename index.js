const express = require('express');
const { Sequelize, DataTypes, Op } = require('sequelize');

const app = express();
const port = 3000;

app.set('view engine', 'ejs');
app.set('views', './views');
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
require('dotenv').config();


let Appeal = null;
let sequelize = null;

async function init() {
    const sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASSWORD, {
        host: process.env.DB_HOST,
        port: parseInt(process.env.DB_PORT),
        dialect: 'postgres'
    });

    try {
        await sequelize.authenticate();
        console.log('Соединение с БД было успешно установлено');
    } catch (e) {
        console.error('Невозможно выполнить подключение к БД: ', e);
        throw e;
    }

    Appeal = sequelize.define('appeals', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        topic: {
            type: DataTypes.STRING,
            allowNull: false
        },
        description: {
            type: DataTypes.TEXT,
            allowNull: false
        },
        status: {
            type: DataTypes.ENUM('New', 'InProgress', 'Completed', 'Cancelled'),
            allowNull: false,
            defaultValue: 'New'
        },
        decision: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        cancellationReason: {
            type: DataTypes.TEXT,
            allowNull: true },
        createdAt: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW
        },
    }, {
        tableName: 'appeals',
        timestamps: true,
        updatedAt: false,
    });

    await sequelize.sync({});
    console.log('Database synced');
}

app.get('/', async (req, res) => {
    res.redirect('/addAppeals');
});

app.get('/addAppeals', async (req, res) => {
    res.render('addAppeals', { error: null });
});

// добавление обращения
app.post('/addAppeals', async (req, res) => {
    try {
        const { topic, description } = req.body;
        console.log('Received body:', req.body);
        if (!topic || !description) {
            return res.status(400).json({ error: 'Topic and description are required' });
        }
        const appeal = await Appeal.create({ topic, description, status: 'New' });
        console.log('Created appeal:', appeal.toJSON());
        res.redirect("/addAppeals")
    } catch (error) {
        console.error('Error in /addAppeals:', error.message, error.stack);
        res.status(500).json({ error: 'Failed to create appeal' });
    }
});

/*

app.get('/appeals', async (req, res) => {
  /!*  try {
        const appeals = await Appeal.findAll({ order: [['id', 'ASC']] });*!/
    const appeals = [];
    res.render('appeals', { appeals: appeals});
 /!*   } catch (error) {
        console.error('Error in /appeals:', error.message, error.stack);
        res.status(500).render('appeals', { error: 'Failed to fetch appeals', appeals: [] });
    }*!/
});

app.post('/appeals', async (req, res) => {
    try {
        const {date, startDate, endDate} = req.query;
        const where = {};

        if (date) {
            const targetDate = new Date(date);
            where.createdAt = {
                [Op.and]: date,
                [Op.gte]: targetDate,
                [Op.lte]: new Date(targetDate.setHours(23, 59, 59, 999)),
            };
        } else if (startDate && endDate) {
            where.createdAt = {
                [Op.between]: [new Date(startDate), new Date(endDate)],
            };
        } else if (startDate || endDate) {
            errorMessage.textContent = 'Укажите обе даты для диапазона';
            console.log('Error');
            return;
        }
        const appeals = await Appeal.findAll({
            where,
            order: [['id', 'ASC']],
        });

        res.render('appeals', { appeals: appeals});
    } catch (error) {
        console.error('Error in /appeals:', error.message, error.stack);
        res.status(500).render('appeals', { appeals: [], error: 'Failed to fetch appeals' });
    }
});

*/

// GET /appeals (показ обращений с фильтром)
app.get('/appeals', async (req, res) => {
    try {
        const { date, startDate, endDate } = req.query;
        const where = {};

        // Фильтр по конкретной дате
        if (date) {
            const targetDate = new Date(date);
            if (isNaN(targetDate.getTime())) {
                return res.status(400).render('appeals', {
                    appeals: [],
                    errorMessage: 'Неверный формат даты',
                    successMessage: ''
                });
            }
            const endOfDay = new Date(targetDate);
            endOfDay.setHours(23, 59, 59, 999);
            where.createdAt = {
                [Op.gte]: targetDate,
                [Op.lte]: endOfDay
            };
        }
        // Фильтр по диапазону дат
        else if (startDate && endDate) {
            const start = new Date(startDate);
            const end = new Date(endDate);
            if (isNaN(start.getTime()) || isNaN(end.getTime())) {
                return res.status(400).render('appeals', {
                    appeals: [],
                    errorMessage: 'Неверный формат дат',
                    successMessage: ''
                });
            }
            const endOfDay = new Date(end);
            endOfDay.setHours(23, 59, 59, 999);
            where.createdAt = {
                [Op.between]: [start, endOfDay]
            };
        } else if (startDate || endDate) {
            return res.status(400).render('appeals', {
                appeals: [],
                errorMessage: 'Укажите обе даты для диапазона',
                successMessage: ''
            });
        }

        // Получаем обращения (все, если фильтр не задан)
        const appeals = await Appeal.findAll({
            where,
            order: [['id', 'ASC']]
        });

        res.render('appeals', {
            appeals,
            errorMessage: '',
            successMessage: ''
        });
    } catch (error) {
        console.error('Error in /appeals:', error.message, error.stack);
        res.status(500).render('appeals', {
            appeals: [],
            errorMessage: 'Не удалось загрузить обращения',
            successMessage: ''
        });
    }
});


app.post('/appeals', async (req, res) => {
    try {
        const { date, startDate, endDate } = req.body;
        let query = '';

        // Формирование строки запроса для редиректа
        if (date) {
            if (isNaN(new Date(date).getTime())) {
                return res.status(400).render('appeals', {
                    appeals: [],
                    errorMessage: 'Неверный формат даты',
                    successMessage: ''
                });
            }
            query = `date=${encodeURIComponent(date)}`;
        } else if (startDate && endDate) {
            if (isNaN(new Date(startDate).getTime()) || isNaN(new Date(endDate).getTime())) {
                return res.status(400).render('appeals', {
                    appeals: [],
                    errorMessage: 'Неверный формат дат',
                    successMessage: ''
                });
            }
            query = `startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`;
        } else if (startDate || endDate) {
            return res.status(400).render('appeals', {
                appeals: [],
                errorMessage: 'Укажите обе даты для диапазона',
                successMessage: ''
            });
        }


        res.redirect(`/appeals${query ? '?' + query : ''}`);
    } catch (error) {
        console.error('Error in /appeals:', error.message, error.stack);
        res.status(500).render('appeals', {
            appeals: [],
            errorMessage: 'Не удалось обработать запрос',
            successMessage: ''
        });
    }
});
app.post('/takeAppeal', async (req, res) => {
    const { appealId } = req.body;

    await Appeal.update(
        { status: 'InProgress'},
        { where: { id: appealId } }
    );

    const appeal = await Appeal.findOne({ where: { id: appealId} });
    const show_modal = !!req.body.modal;

    if (!appeal) {
        return res.status(404).json({ error: 'Обращение не найдено' });
    }

    res.render('takeAppeal', { appeal, show_modal});
});


app.post('/completeAppeal', async (req, res) => {
    const { appealId, decision } = req.body;
    const appeal = await Appeal.findOne({ where: { id: appealId} });
    if (!appeal) {
        return res.status(404).json({ error: 'Обращение не найдено' });
    }
    await Appeal.update(
        { status: 'Completed',
            decision: decision},
        { where: { id: appealId } }
    );
    res.redirect('/appeals');
});



app.post('/cancelAllAppeal', async (req, res) => {
    const { cancellationReason} = req.body;

    await Appeal.update(
        { status: 'Cancelled',
            cancellationReason: cancellationReason},
        { where: { status: 'InProgress' } }
    );
    res.redirect('/appeals');
});



app.post('/cancelSelectedAppeal', async (req, res) => {
    const {appealId, cancellationReason} = req.body;

    await Appeal.update(
        { status: 'Cancelled',
            cancellationReason: cancellationReason},
        { where: { id: appealId }}
    );
    res.redirect('/appeals');
});


app.post('/return', async (req, res) => {
    res.redirect('/appeals');
});

init().then(() => {
    app.listen(port, () => {
        console.log(`Server started at http://localhost:${port}`);
    });
}).catch((err) => {
    console.error('Failed to initialize server:', err);
    process.exit(1);
});