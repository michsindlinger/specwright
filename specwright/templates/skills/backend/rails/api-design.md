# Rails API Design

> Part of: Rails Backend Skill
> Use when: Building REST APIs

## Controller Structure

### Basic API Controller
```ruby
# app/controllers/api/v1/users_controller.rb
module Api
  module V1
    class UsersController < ApplicationController
      before_action :authenticate_user!
      before_action :set_user, only: [:show, :update, :destroy]

      def index
        users = User.active.page(params[:page]).per(20)
        render json: users, each_serializer: UserSerializer
      end

      def show
        render json: @user, serializer: UserDetailSerializer
      end

      def create
        result = Users::Create.new(user_params, current_user).call

        if result.success?
          render json: result.data[:user], status: :created
        else
          render json: { errors: result.errors }, status: :unprocessable_entity
        end
      end

      def update
        result = Users::Update.new(@user, user_params).call

        if result.success?
          render json: result.data[:user]
        else
          render json: { errors: result.errors }, status: :unprocessable_entity
        end
      end

      def destroy
        @user.destroy
        head :no_content
      end

      private

      def set_user
        @user = User.find(params[:id])
      end

      def user_params
        params.require(:user).permit(:name, :email, :role)
      end
    end
  end
end
```

## Serializers

### ActiveModelSerializer
```ruby
# app/serializers/user_serializer.rb
class UserSerializer < ActiveModel::Serializer
  attributes :id, :email, :name, :created_at

  has_many :posts, if: :include_posts?

  def include_posts?
    instance_options[:include_posts]
  end
end

# app/serializers/user_detail_serializer.rb
class UserDetailSerializer < UserSerializer
  attributes :phone, :address, :last_login_at

  has_many :posts
  has_one :organization
end
```

### Blueprinter (Alternative)
```ruby
# app/blueprints/user_blueprint.rb
class UserBlueprint < Blueprinter::Base
  identifier :id

  fields :email, :name, :created_at

  view :detail do
    fields :phone, :address
    association :posts, blueprint: PostBlueprint
  end
end

# Usage
UserBlueprint.render(user)
UserBlueprint.render(user, view: :detail)
```

## Error Handling

### Application Controller
```ruby
class ApplicationController < ActionController::API
  rescue_from ActiveRecord::RecordNotFound, with: :not_found
  rescue_from ActiveRecord::RecordInvalid, with: :unprocessable_entity
  rescue_from ActionController::ParameterMissing, with: :bad_request

  private

  def not_found(exception)
    render json: { error: 'Not found' }, status: :not_found
  end

  def unprocessable_entity(exception)
    render json: { errors: exception.record.errors.full_messages },
           status: :unprocessable_entity
  end

  def bad_request(exception)
    render json: { error: exception.message }, status: :bad_request
  end
end
```

## Pagination

### With Kaminari
```ruby
def index
  users = User.page(params[:page]).per(params[:per_page] || 20)

  render json: {
    data: ActiveModelSerializers::SerializableResource.new(users),
    meta: {
      current_page: users.current_page,
      total_pages: users.total_pages,
      total_count: users.total_count
    }
  }
end
```

## Versioning

### URL Versioning
```ruby
# config/routes.rb
Rails.application.routes.draw do
  namespace :api do
    namespace :v1 do
      resources :users
    end

    namespace :v2 do
      resources :users
    end
  end
end
```

## Authentication

### JWT Authentication
```ruby
# app/controllers/concerns/authenticatable.rb
module Authenticatable
  extend ActiveSupport::Concern

  included do
    before_action :authenticate_user!
  end

  def authenticate_user!
    token = request.headers['Authorization']&.split(' ')&.last
    @current_user = JwtService.decode(token)
  rescue JWT::DecodeError
    render json: { error: 'Unauthorized' }, status: :unauthorized
  end

  def current_user
    @current_user
  end
end
```

## Best Practices

1. **Use namespaces** for API versioning
2. **Use serializers** for consistent responses
3. **Handle errors globally** in ApplicationController
4. **Paginate collections** to prevent memory issues
5. **Document API** with Swagger/OpenAPI
6. **Use services** for business logic
