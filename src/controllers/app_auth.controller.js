const authService = require('../services/app_auth.service')
const { sendSuccess, sendCreated } = require('../utils/response')

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body
    const result = await authService.login(
      { email, password },
      { ip: req.ip, userAgent: req.headers['user-agent'] }
    )
    return sendSuccess(res, {
      message: 'Login successful',
      data: {
        accessToken:  result.accessToken,
        refreshToken: result.refreshToken,
        user:         result.user,
      },
    })
  } catch (err) {
    next(err)
  }
}

const refresh = async (req, res, next) => {
  try {
    const { refreshToken } = req.body
    if (!refreshToken) {
      return res.status(400).json({ success: false, message: 'Refresh token required' })
    }
    const result = await authService.refresh(
      refreshToken,
      { ip: req.ip, userAgent: req.headers['user-agent'] }
    )
    return sendSuccess(res, { data: result })
  } catch (err) {
    next(err)
  }
}

const logout = async (req, res, next) => {
  try {
    const { refreshToken } = req.body
    await authService.logout(refreshToken)
    return sendSuccess(res, { message: 'Logged out successfully' })
  } catch (err) {
    next(err)
  }
}

const logoutAll = async (req, res, next) => {
  try {
    await authService.logoutAll(req.appUser.id)
    return sendSuccess(res, { message: 'All sessions logged out' })
  } catch (err) {
    next(err)
  }
}

module.exports = { login, refresh, logout, logoutAll }
