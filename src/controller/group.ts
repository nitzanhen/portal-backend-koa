import Router from '@koa/router';
import { err, ok } from '../common/Result.js';
import { adminsOnly } from '../middleware/adminsOnly.js';
import { middlewareGuard } from '../middleware/middlewareGuard.js';
import { validate } from '../middleware/validate.js';
import { GroupSchema, GroupWithIdSchema } from '../model/Group.js';
import { ObjectIdSchema } from '../model/ObjectId.js';
import { db } from '../peripheral/db.js';

const groupCollection = db.collection('groups');
const userCollection = db.collection('users');

const router = new Router({
  prefix: '/group'
});

router.get('/',
  validate(ObjectIdSchema.optional(), ['query', 'userId']),
  middlewareGuard(async ctx => {
    const { userId } = ctx.query;

    const user = (userId && (await userCollection.findOne({ _id: userId }))) ?? null

    const filter = user ? { $in: user.groups } : {}
    const groups = await groupCollection.find(filter).toArray();

    ctx.body = ok(groups);
  })
);

router.get('/:id',
  validate(ObjectIdSchema, ['params', 'id']),
  middlewareGuard(async ctx => {
    const { id } = ctx.params;
    const group = await groupCollection.findOne({ _id: id });

    if (!group) {
      ctx.status = 400;
      ctx.body = err('No group exists with the given id');
      return;
    }
    ctx.body = ok(group)
  }),
);

router.post('/',
  adminsOnly,
  validate(GroupSchema, ['request', 'body']),
  middlewareGuard(async ctx => {
    const group = ctx.request.body;

    const response = await groupCollection.insertOne(group);

    ctx.body = ok({ _id: response.insertedId, ...group });
  })
);

const PartialGroupWithIdSchema = GroupWithIdSchema.partial();

router.patch('/',
  adminsOnly,
  validate(PartialGroupWithIdSchema, ['request', 'body']),
  middlewareGuard(async ctx => {
    const group = ctx.body;

    const response = await groupCollection.findOneAndUpdate(
      { _id: group._id },
      { $set: group },
      { returnDocument: 'after' }
    );

    if (!response.ok) {
      throw new Error('unknown error occured when attempting to update the group');
    }
    else if (!response.value) {
      ctx.status = 400;
      ctx.body = err("No group exists with the given id")
    }

    ctx.body = ok(response.value)
  })
);

router.delete('/',
  adminsOnly,
  validate(ObjectIdSchema, ['request', 'body', '_id']),
  middlewareGuard(async ctx => {
    const { _id } = ctx.body;

    const response = await groupCollection.findOneAndDelete({ _id });
    if (!response.ok) {
      throw new Error('Unknown error occured while attempting to delete a group');
    }
    else if (!response.value) {
      ctx.status = 400;
      ctx.body = err("No group exists with the given id");
      return;
    }

    ctx.body = ok(response.value);
  })
);


router.get('/management',
  adminsOnly,
  middlewareGuard(ctx => {

  }),
  middlewareGuard(ctx => {

  })
);

export default router;