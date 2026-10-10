import { Prisma } from '@prisma/client';
import { prisma } from '../config/db';
import { asyncHandler, ok, param } from '../utils/http';
import { conflict, notFound } from '../utils/errors';
import { hashPassword } from '../utils/password';
import { publicStudent } from '../services/authService';

export const listStudents = asyncHandler(async (req, res) => {
  const q = req.query as unknown as { search?: string; year?: 'ONE_YEAR' | 'TWO_YEAR'; status?: 'ACTIVE' | 'INACTIVE'; page: number; pageSize: number };
  const where: Prisma.StudentWhereInput = {
    ...(q.year ? { year: q.year } : {}), ...(q.status ? { status: q.status } : {}),
    ...(q.search ? { OR: [{ studentId: { contains: q.search, mode: 'insensitive' } }, { name: { contains: q.search, mode: 'insensitive' } }] } : {}),
  };
  const [total, rows] = await Promise.all([
    prisma.student.count({ where }),
    prisma.student.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (q.page - 1) * q.pageSize, take: q.pageSize }),
  ]);
  ok(res, { items: rows.map(publicStudent), total, page: q.page, pageSize: q.pageSize });
});

export const createStudent = asyncHandler(async (req, res) => {
  const { password, ...data } = req.body;
  const student = await prisma.student.create({ data: { ...data, passwordHash: await hashPassword(password) } })
    .catch((e) => { if (e?.code === 'P2002') throw conflict('Student ID already exists', 'STUDENT_ID_TAKEN'); throw e; });
  ok(res, publicStudent(student), 201);
});

export const getStudent = asyncHandler(async (req, res) => {
  const student = await prisma.student.findUnique({ where: { id: param(req, 'id') }, include: { _count: { select: { attempts: true, results: true } } } });
  if (!student) throw notFound('Student not found', 'STUDENT_NOT_FOUND');
  ok(res, publicStudent(student));
});

export const updateStudent = asyncHandler(async (req, res) => {
  const student = await prisma.student.update({ where: { id: param(req, 'id') }, data: req.body })
    .catch((e) => { if (e?.code === 'P2002') throw conflict('Student ID already exists', 'STUDENT_ID_TAKEN'); throw e; });
  ok(res, publicStudent(student));
});

export const deleteStudent = asyncHandler(async (req, res) => {
  await prisma.student.delete({ where: { id: param(req, 'id') } });
  ok(res, { deleted: true });
});

export const setStudentStatus = asyncHandler(async (req, res) => {
  const student = await prisma.student.update({ where: { id: param(req, 'id') }, data: { status: req.body.status } });
  ok(res, publicStudent(student));
});

export const resetStudentPassword = asyncHandler(async (req, res) => {
  await prisma.student.update({ where: { id: param(req, 'id') }, data: { passwordHash: await hashPassword(req.body.password) } });
  ok(res, { reset: true });
});
