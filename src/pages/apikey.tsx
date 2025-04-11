import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { useAppContext } from '../context/AppContext'
import { supabase } from '../lib/supabaseClient'

export default function ApiKeyPage() {
  const router = useRouter()
  const [apiKey, setApiKey] = useState('')
  const [provider, setProvider] = useState<'openai' | 'gemini' | 'claude'>('openai')
  const [saved, setSaved] = useState(false)
  const { setProvider: setGlobalProvider } = useAppContext()
  const [clientName, setClientName] = useState('')

  useEffect(() => {
    const fetchKey = async () => {
      const { data: { user }, error: userError } = await supabase.auth.getUser()

      if (!user || userError) {
        console.warn('❌ ログインしていない、またはセッションが切れているため /login に移動します')
        router.push('/login')
        return
      }

      const { data, error } = await supabase
        .from('user_api_keys')
        .select('api_key, provider')
        .eq('user_id', user.id)
        .single()

      if (data) {
        setApiKey(data.api_key)
        setProvider(data.provider)
        setGlobalProvider(data.provider)
      }
    }

    fetchKey()
  }, [])

  const handleSave = async () => {
    if (!clientName.trim()) {
      alert("法人名（会社名）を入力してください")
      return
    }

    if (!apiKey.trim()) {
      alert("APIキーを入力してください（Claude含む、初回登録時は必須）")
      return
    }    

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (!user || userError) {
      console.error('❌ ユーザー取得失敗:', userError)
      return
    }

    const { data: companyData, error: companyError } = await supabase
      .from('companies')
      .upsert({ name: clientName }) // nameが一意と仮定
      .select('id')
      .single()

    if (companyError || !companyData?.id) {
      console.error("❌ 会社の登録または取得に失敗:", companyError)
      alert("法人名の登録に失敗しました")
      return
    }

    const { error: profileError } = await supabase
      .from('user_profiles')
      .upsert({ id: user.id, company_id: companyData.id })

    if (profileError) {
      console.error("❌ ユーザーの company_id 紐付けに失敗:", profileError)
      alert("ユーザー情報の更新に失敗しました")
      return
    }

    const { error } = await supabase
      .from('user_api_keys')
      .upsert(
        [
          {
            user_id: user.id,
            provider,
            api_key: apiKey, // ← Claudeでも正しく保存されるようになる！
            client_name: clientName,
          }
        ],
        {
          onConflict: 'user_id,provider'
        }
      )

    if (!error) {
      setSaved(true)
      setApiKey('')
      router.push('/')
    } else {
      console.error('❌ Supabase保存エラー:', error)
      alert('保存中にエラーが発生しました')
    }
  }

  const placeholderMap: Record<string, string> = {
    openai: 'sk-xxxxxxxxxxxx',
    gemini: 'AIzaSyxxxxxxxxxxxxxxx',
    claude: 'sk-ant-xxxxxxxx（初回は入力が必要です）'
  }

  return (
    <div className="signup-container">
      <h1 className="signup-title">AIプロバイダー設定</h1>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          handleSave()
        }}
        className="signup-form"
      >
        <div>
          <label htmlFor="clientName">法人名（会社名）を入力：</label>
          <input
            id="clientName"
            type="text"
            placeholder="例：スター株式会社"
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
          />
        </div>

        <div>
          <label className="block mb-2 font-semibold">AIプロバイダーを選択：</label>
          <div className="radio-group">
            {[
              { value: "openai", label: "ChatGPT（OpenAI）" },
              { value: "gemini", label: "Gemini（Google）" },
              { value: "claude", label: "Claude（Anthropic）" },
            ].map((option) => (
              <label key={option.value} className="radio-row">
                <input
                  type="radio"
                  name="provider"
                  value={option.value}
                  checked={provider === option.value}
                  onChange={() => setProvider(option.value as 'openai' | 'gemini' | 'claude')}
                />
                <span>{option.label}</span>
              </label>
            ))}
          </div>
        </div>

        {!(provider === 'claude' && apiKey !== '') ? (
  <>
    <label htmlFor="apiKey">APIキーを入力：</label>
    <input
      id="apiKey"
      type="text"
      placeholder={placeholderMap[provider]}
      value={apiKey}
      onChange={(e) => setApiKey(e.target.value)}
    />
  </>
) : (
  <p style={{ color: 'gray', marginTop: '8px' }}>
    Claudeをご利用の方は、<strong>初回のみAPIキーの入力が必要</strong>です。<br />
    登録後はサーバーに保存され、再入力は不要になります。
  </p>
)}

        <div className="text-center">
          <button type="submit">
            {provider === 'claude' ? '次へ進む →' : '保存してチャット画面へ進む →'}
          </button>
        </div>

        {saved && <p className="text-green-600 text-sm mt-2">✅ 保存に成功しました</p>}
      </form>
    </div>
  )
}
